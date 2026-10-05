import type { ClaimedBookingEmail } from "@repo/supabase";
import { sendVisitEmail } from "./send-visit-email";

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
  company?: string | null;
}

export function sendConfirmationEmail(
  reference: string,
  deps: ConfirmationEmailDeps,
): Promise<"sent" | "skipped" | "failed"> {
  return sendVisitEmail(reference, "confirmation", {
    ...deps,
    claim: (ref) => deps.claim(ref),
    markSent: (ref, _kind, id) => deps.markSent(ref, id),
    release: (ref) => deps.release(ref),
  });
}
