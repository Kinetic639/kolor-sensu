import type { NewsletterContactToSync } from "@repo/supabase/newsletter";
import type { Resend } from "resend";

// Bringing Resend up to date with the list (the database is the source of
// truth; Resend keeps a copy as its contacts, to send the newsletter to):
// a confirmed address becomes a contact (subscribed again if it was
// unsubscribed there), in the newsletter's segment when one is set, with
// the code of its unsubscribe link as the contact's property; an address
// unsubscribed on our page is unsubscribed there too; an address being
// removed is deleted there, then here. Run right after a confirmation or an
// unsubscribe and by the schedule (/api/cron/newsletter), which retries
// whatever failed.

/** The contact property each issue's unsubscribe link reads. */
export const UNSUBSCRIBE_TOKEN_PROPERTY = "unsubscribe_token";

export interface NewsletterContacts {
  /** Creates or resubscribes the contact, with its code; its id in Resend. */
  upsert: (email: string, unsubscribeToken: string) => Promise<string>;
  /** Marks the contact unsubscribed (an unknown one: nothing to do). */
  unsubscribe: (email: string) => Promise<void>;
  /** Deletes the contact (an unknown one counts as deleted). */
  remove: (email: string) => Promise<void>;
}

export function resendNewsletterContacts(
  client: Resend,
  segmentId: string | undefined,
): NewsletterContacts {
  // Resend wants a property defined before contacts carry it: once a run.
  let defined: Promise<void> | null = null;
  const defineProperty = () =>
    (defined ??= (async () => {
      const listed = await client.contactProperties.list();
      if (listed.error) throw new Error(`Resend: ${listed.error.message}`);
      if (
        listed.data?.data.some((one) => one.key === UNSUBSCRIBE_TOKEN_PROPERTY)
      ) {
        return;
      }
      const created = await client.contactProperties.create({
        key: UNSUBSCRIBE_TOKEN_PROPERTY,
        type: "string",
        fallbackValue: "",
      });
      if (created.error) throw new Error(`Resend: ${created.error.message}`);
    })().catch((error: unknown) => {
      defined = null;
      throw error;
    }));

  return {
    async upsert(email, unsubscribeToken) {
      await defineProperty();
      const properties = { [UNSUBSCRIBE_TOKEN_PROPERTY]: unsubscribeToken };
      const found = await client.contacts.get({ email });
      if (found.data) {
        const updated = await client.contacts.update({
          email,
          unsubscribed: false,
          properties,
        });
        if (updated.error) throw new Error(`Resend: ${updated.error.message}`);
        if (segmentId) {
          const added = await client.contacts.segments.add({
            email,
            segmentId,
          });
          if (added.error) throw new Error(`Resend: ${added.error.message}`);
        }
        return found.data.id;
      }
      if (found.error && found.error.name !== "not_found") {
        throw new Error(`Resend: ${found.error.message}`);
      }
      const created = await client.contacts.create({
        email,
        unsubscribed: false,
        properties,
        ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
      });
      if (created.error || !created.data) {
        throw new Error(`Resend: ${created.error?.message ?? "no data"}`);
      }
      return created.data.id;
    },
    async unsubscribe(email) {
      const updated = await client.contacts.update({
        email,
        unsubscribed: true,
      });
      if (updated.error && updated.error.name !== "not_found") {
        throw new Error(`Resend: ${updated.error.message}`);
      }
    },
    async remove(email) {
      const removed = await client.contacts.remove({ email });
      if (removed.error && removed.error.name !== "not_found") {
        throw new Error(`Resend: ${removed.error.message}`);
      }
    },
  };
}

export interface SyncDeps {
  toSync: () => Promise<NewsletterContactToSync[]>;
  contacts: NewsletterContacts;
  /** Brought up to date (with its contact's id, once copied). */
  markSynced: (id: string, contactId: string | null) => Promise<void>;
  finishRemoval: (id: string) => Promise<void>;
}

/** One pass over what is waiting; never throws for a single address. */
export async function syncNewsletter(deps: SyncDeps) {
  const waiting = await deps.toSync();
  let synced = 0;
  let unsubscribed = 0;
  let removed = 0;
  let failed = 0;
  for (const subscriber of waiting) {
    try {
      if (subscriber.status === "active") {
        const contactId = await deps.contacts.upsert(
          subscriber.email,
          subscriber.unsubscribeToken,
        );
        await deps.markSynced(subscriber.id, contactId);
        synced += 1;
      } else if (subscriber.status === "unsubscribed") {
        await deps.contacts.unsubscribe(subscriber.email);
        await deps.markSynced(subscriber.id, null);
        unsubscribed += 1;
      } else {
        await deps.contacts.remove(subscriber.email);
        await deps.finishRemoval(subscriber.id);
        removed += 1;
      }
    } catch (error) {
      failed += 1;
      console.error("[newsletter] bringing Resend up to date failed:", error);
    }
  }
  return { synced, unsubscribed, removed, failed };
}
