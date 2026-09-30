import { render } from "@react-email/components";
import { createHash } from "node:crypto";
import type { ClaimedBookingEmail } from "@repo/supabase";
import { confirmationContent } from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";

// Sending the confirmation (docs/product/booking-plan.md, R7): claimed in
// the database first, so the webhook and the return page never both send
// it; Resend's idempotency key guards a retry of the same send. A failure
// gives the claim back and never fails the payment around it.

export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments: { filename: string; contentType: string; content: string }[];
}

export interface ConfirmationEmailDeps {
  claim: (reference: string) => Promise<ClaimedBookingEmail | null>;
  markSent: (reference: string, messageId: string) => Promise<void>;
  release: (reference: string) => Promise<void>;
  send: (
    email: OutgoingEmail,
    idempotencyKey: string,
  ) => Promise<{ id: string }>;
  from: string;
  siteUrl: string;
  timeZone: string;
  contact: { phone?: string; email?: string };
}

/** Tells one claim from the next (each has its own link token). */
function claimKey(manageToken: string) {
  return createHash("sha256").update(manageToken).digest("hex").slice(0, 16);
}

export async function sendConfirmationEmail(
  reference: string,
  deps: ConfirmationEmailDeps,
): Promise<"sent" | "skipped" | "failed"> {
  const visit = await deps.claim(reference);
  if (!visit) return "skipped";
  try {
    const content = confirmationContent(visit, deps);
    const { id } = await deps.send(
      {
        from: deps.from,
        to: visit.clientEmail,
        subject: content.subject,
        html: await render(<ConfirmationEmail content={content} />),
        text: content.text,
        attachments: [
          {
            filename: `wizyta-${visit.reference}.ics`,
            contentType: "text/calendar; charset=utf-8; method=PUBLISH",
            content: content.ics,
          },
        ],
      },
      `confirmation:${visit.reference}:${claimKey(visit.manageToken)}`,
    );
    await deps.markSent(reference, id);
    return "sent";
  } catch (error) {
    console.error(`[booking] confirmation e-mail ${reference} failed:`, error);
    await deps.release(reference).catch(() => undefined);
    return "failed";
  }
}
