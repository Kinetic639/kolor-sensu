import { render } from "@react-email/components";
import { createHash } from "node:crypto";
import type { BookingEmailKind, ClaimedBookingEmail } from "@repo/supabase";
import { confirmationContent, withCompany } from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";
import {
  reservationContent,
  unpaidCancelledContent,
  visitReminderContent,
} from "./payment-content";
import type { ChangeEmailDeps } from "./send-change";

// Sending a visit's own e-mails (docs/product/booking-plan.md, R7, R11): the
// confirmation, the reservation with the link to pay, the two payment
// reminders, the cancellation for want of payment and the reminder a day
// before. Claimed in the database first, so each goes once whoever sends
// it (the payment, the portal, the scheduled job); Resend's idempotency
// key guards a retry of the same send. A failure gives the claim back.

// A move and a later refund go with the change that made them (./send-change).
export type VisitEmailKind = Exclude<
  BookingEmailKind,
  "rescheduled" | "refunded"
>;

export type VisitEmailDeps = ChangeEmailDeps;

/** Tells one claim from the next (each has its own link token). */
function claimKey(manageToken: string | null) {
  return manageToken
    ? createHash("sha256").update(manageToken).digest("hex").slice(0, 16)
    : "once";
}

export async function sendVisitEmail(
  reference: string,
  kind: VisitEmailKind,
  deps: VisitEmailDeps,
): Promise<"sent" | "skipped" | "failed"> {
  const visit = await deps.claim(reference, kind);
  if (!visit) return "skipped";
  return deliverVisitEmail(visit, kind, deps);
}

/** Sends an e-mail already claimed; never throws (gives the claim back). */
export async function deliverVisitEmail(
  visit: ClaimedBookingEmail,
  kind: VisitEmailKind,
  deps: Omit<VisitEmailDeps, "claim">,
): Promise<"sent" | "skipped" | "failed"> {
  const { reference } = visit;
  try {
    const { manageToken } = visit;
    let content;
    if (kind === "cancelled") {
      // Only the cancellation for want of payment goes this way; the
      // others go with the change that made them (./send-change).
      if (visit.cancelledBy !== "system") {
        await deps.release(reference, kind);
        return "skipped";
      }
      content = unpaidCancelledContent(visit, deps);
    } else {
      if (!manageToken) throw new Error("The claim gave no link token");
      const linked = { ...visit, manageToken };
      content =
        kind === "confirmation"
          ? confirmationContent(linked, deps)
          : kind === "reminder"
            ? visitReminderContent(linked, deps)
            : reservationContent(kind, linked, deps);
    }
    const cancelled = kind === "cancelled";
    const { id } = await deps.send(
      {
        from: deps.from,
        to: visit.clientEmail,
        subject: content.subject,
        html: await render(
          <ConfirmationEmail company={deps.company} content={content} />,
        ),
        text: withCompany(content.text, deps.company),
        attachments: [
          {
            filename: `wizyta-${visit.reference}.ics`,
            contentType: `text/calendar; charset=utf-8; method=${cancelled ? "CANCEL" : "PUBLISH"}`,
            content: content.ics,
          },
        ],
      },
      `${kind}:${visit.reference}:${claimKey(manageToken)}`,
    );
    await deps.markSent(reference, kind, id);
    return "sent";
  } catch (error) {
    console.error(`[booking] ${kind} e-mail ${reference} failed:`, error);
    await deps.release(reference, kind).catch(() => undefined);
    return "failed";
  }
}
