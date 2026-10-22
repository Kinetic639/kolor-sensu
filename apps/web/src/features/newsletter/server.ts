import {
  finishNewsletterRemoval,
  markNewsletterSynced,
  newsletterContactsToSync,
} from "@repo/supabase/newsletter";
import { resend } from "@/lib/email";
import { createSecretClient } from "@/lib/supabase/secret";
import { resendNewsletterContacts, syncNewsletter } from "./sync";

// The newsletter's server side, wired to the database and Resend:
// RESEND_NEWSLETTER_SEGMENT_ID (optional) is the segment in Resend the
// newsletter goes to; without it the contacts are only in Resend's list.

export function syncNewsletterNow() {
  const client = createSecretClient();
  return syncNewsletter({
    toSync: () => newsletterContactsToSync(client),
    contacts: resendNewsletterContacts(
      resend(),
      process.env.RESEND_NEWSLETTER_SEGMENT_ID?.trim() || undefined,
    ),
    markSynced: (id, contactId) => markNewsletterSynced(client, id, contactId),
    finishRemoval: (id) => finishNewsletterRemoval(client, id),
  });
}
