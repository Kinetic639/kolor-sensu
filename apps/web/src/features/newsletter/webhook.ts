import type { NewsletterStopReason } from "@repo/contracts/newsletter";
import type { WebhookEventPayload } from "resend";

// What Resend's webhook tells the list (/api/resend/webhook): a contact
// that unsubscribed (the link in a newsletter, or one-click unsubscribe in
// the mail program) or was deleted there stops; so does an address that
// bounced for good or reported a newsletter as spam. Bounces and
// complaints count only for the newsletter's own e-mails (a broadcast, or
// the confirmation link, tagged "newsletter"), not for the visits' e-mails.
// Handling an event twice changes nothing.

export const NEWSLETTER_TAG = { name: "category", value: "newsletter" };

export interface WebhookDeps {
  stop: (email: string, reason: NewsletterStopReason) => Promise<boolean>;
}

function isNewsletterEmail(data: {
  broadcast_id?: string;
  tags?: Record<string, string>;
}) {
  return (
    Boolean(data.broadcast_id) ||
    data.tags?.[NEWSLETTER_TAG.name] === NEWSLETTER_TAG.value
  );
}

/** The addresses it stopped. */
export async function handleResendEvent(
  event: WebhookEventPayload,
  deps: WebhookDeps,
): Promise<string[]> {
  const stop = async (emails: string[], reason: NewsletterStopReason) => {
    const stopped: string[] = [];
    for (const email of emails) {
      if (await deps.stop(email, reason)) stopped.push(email);
    }
    return stopped;
  };
  switch (event.type) {
    case "contact.updated":
      return event.data.unsubscribed
        ? stop([event.data.email], "unsubscribed")
        : [];
    case "contact.deleted":
      return stop([event.data.email], "unsubscribed");
    case "email.bounced":
      return event.data.bounce.type === "Permanent" &&
        isNewsletterEmail(event.data)
        ? stop(event.data.to, "bounced")
        : [];
    case "email.complained":
      return isNewsletterEmail(event.data)
        ? stop(event.data.to, "complained")
        : [];
    default:
      return [];
  }
}
