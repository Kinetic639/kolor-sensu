import { render } from "@react-email/components";
import type { BookingEmailKind, ClaimedBookingEmail } from "@repo/supabase";
import {
  cancelledContent,
  refundedContent,
  rescheduledContent,
} from "./change-content";
import { withCompany, type ConfirmationOptions } from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";
import type { OutgoingEmail } from "./send-confirmation";

// Sending the e-mail about a change (docs/product/booking-plan.md, R8, R12):
// a move, a cancellation, money the centre gave back later. As
// the confirmation is sent: claimed first, so it goes once; given back when
// sending fails. It never fails the change itself.

export type VisitChange =
  | {
      kind: "rescheduled";
      reference: string;
      /** Null when the centre moves it: the claim brings a new link. */
      manageToken: string | null;
      /** How many times the visit has moved (the calendar event's version). */
      sequence: number;
      /** Why the centre moved it. */
      reason?: string | null;
    }
  | {
      kind: "cancelled";
      reference: string;
      /** Null when the centre cancels: the claim brings a new link. */
      manageToken: string | null;
      sequence: number;
      refundMinor: number;
      /** Why the centre cancelled it (and kept what it kept). */
      reason?: string | null;
    }
  | {
      kind: "refunded";
      reference: string;
      /** This refund. */
      refundMinor: number;
      /** Given back on the payment before it: tells refunds apart. */
      refundedBeforeMinor: number;
      reason: string | null;
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
    const manageToken =
      (change.kind === "refunded" ? null : change.manageToken) ??
      visit.manageToken;
    if (!manageToken) throw new Error("No link token for the e-mail");
    const options = { ...deps, manageToken, reason: change.reason ?? null };
    const content =
      change.kind === "refunded"
        ? refundedContent(visit, {
            ...options,
            refundMinor: change.refundMinor,
          })
        : change.kind === "cancelled"
          ? cancelledContent(visit, {
              ...options,
              sequence: change.sequence,
              refundMinor: change.refundMinor,
            })
          : rescheduledContent(visit, {
              ...options,
              sequence: change.sequence,
            });
    const { id } = await deps.send(
      {
        from: deps.from,
        to: visit.clientEmail,
        subject: content.subject,
        html: await render(
          <ConfirmationEmail company={deps.company} content={content} />,
        ),
        text: withCompany(content.text, deps.company),
        attachments: content.ics
          ? [
              {
                filename: `wizyta-${visit.reference}.ics`,
                contentType: `text/calendar; charset=utf-8; method=${kind === "cancelled" ? "CANCEL" : "PUBLISH"}`,
                content: content.ics,
              },
            ]
          : [],
      },
      change.kind === "refunded"
        ? `refunded:${reference}:${change.refundedBeforeMinor}:${change.refundMinor}`
        : change.kind === "cancelled"
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
