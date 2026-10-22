import type { NewsletterContactToSync } from "@repo/supabase/newsletter";
import type { Resend } from "resend";

// Bringing Resend up to date with the list (the database is the source of
// truth; Resend keeps a copy as its contacts, to send the newsletter to):
// a confirmed address becomes a contact (subscribed again if it was
// unsubscribed there), in the newsletter's segment when one is set; an
// address being removed is deleted there, then here. Run right after a
// confirmation and by the schedule (/api/cron/newsletter), which retries
// whatever failed.

export interface NewsletterContacts {
  /** Creates or resubscribes the contact; its id in Resend. */
  upsert: (email: string) => Promise<string>;
  /** Deletes the contact (an unknown one counts as deleted). */
  remove: (email: string) => Promise<void>;
}

export function resendNewsletterContacts(
  client: Resend,
  segmentId: string | undefined,
): NewsletterContacts {
  return {
    async upsert(email) {
      const found = await client.contacts.get({ email });
      if (found.data) {
        const updated = await client.contacts.update({
          email,
          unsubscribed: false,
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
        ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
      });
      if (created.error || !created.data) {
        throw new Error(`Resend: ${created.error?.message ?? "no data"}`);
      }
      return created.data.id;
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
  markSynced: (id: string, contactId: string) => Promise<void>;
  finishRemoval: (id: string) => Promise<void>;
}

/** One pass over what is waiting; never throws for a single address. */
export async function syncNewsletter(deps: SyncDeps) {
  const waiting = await deps.toSync();
  let synced = 0;
  let removed = 0;
  let failed = 0;
  for (const subscriber of waiting) {
    try {
      if (subscriber.status === "active") {
        const contactId = await deps.contacts.upsert(subscriber.email);
        await deps.markSynced(subscriber.id, contactId);
        synced += 1;
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
  return { synced, removed, failed };
}
