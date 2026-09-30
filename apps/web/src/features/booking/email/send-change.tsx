import { render } from "@react-email/components";
import type { BookingEmailKind, ClaimedBookingEmail } from "@repo/supabase";
import { cancelledContent, rescheduledContent } from "./change-content";
import type { ConfirmationOptions } from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";
import type { OutgoingEmail } from "./send-confirmation";

// Sending the e-mail about a change (docs/product/booking-plan.md, R8), as
// the confirmation is sent: claimed first, so it goes once; given back when
// sending fails. It never fails the change itself.

export type VisitChange =
  | {
      kind: "rescheduled";
      reference: string;
      manageToken: string;
      /** How many times the visit has moved (the calendar event's version). */
      sequence: number;
    }
  | {
      kind: "cancelled";
      reference: string;
      /** Null when the centre cancels: the claim brings a new link. */
      manageToken: string | null;
      sequence: number;
      refundMinor: number;
    };

export interface ChangeEmailDeps extends ConfirmationOptions {
  claim: (
    reference: string,
    kind: BookingEmailKind,
  ) => Promise<ClaimedBookingEmail | null>;
  markSent: (
    reference: string,
    kind: BookingEmailKind,
    messageId: string,
  ) => Promise<void>;
  release: (reference: string, kind: BookingEmailKind) => Promise<void>;
  send: (
    email: OutgoingEmail,
    idempotencyKey: string,
  ) => Promise<{ id: string }>;
  from: string;
}

export async function sendChangeEmail(
  change: VisitChange,
  deps: ChangeEmailDeps,
): Promise<"sent" | "skipped" | "failed"> {
  const { kind, reference } = change;
  const visit = await deps.claim(reference, kind);
  if (!visit) return "skipped";
  try {
    const manageToken = change.manageToken ?? visit.manageToken;
    if (!manageToken) throw new Error("No link token for the e-mail");
    const options = { ...deps, ...change, manageToken };
    const content =
      change.kind === "cancelled"
        ? cancelledContent(visit, {
            ...options,
            refundMinor: change.refundMinor,
          })
        : rescheduledContent(visit, options);
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
            contentType: `text/calendar; charset=utf-8; method=${kind === "cancelled" ? "CANCEL" : "PUBLISH"}`,
            content: content.ics,
          },
        ],
      },
      kind === "cancelled"
        ? `cancelled:${reference}`
        : `rescheduled:${reference}:${change.sequence}`,
    );
    await deps.markSent(reference, kind, id);
    return "sent";
  } catch (error) {
    console.error(`[booking] ${kind} e-mail ${reference} failed:`, error);
    await deps.release(reference, kind).catch(() => undefined);
    return "failed";
  }
}
