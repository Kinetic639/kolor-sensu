import {
  BookingError,
  type BookingErrorCode,
  type CancelledBooking,
  type CentreCancelledVisit,
  type RescheduledBooking,
} from "@repo/supabase";
import type { VisitChange } from "./email/send-change";

// The client cancelling or moving a visit from its link (docs/product/
// booking-plan.md, R8). The database decides and changes the visit; then
// Stripe gives the money back and the client gets an e-mail. A refund or
// an e-mail that fails never undoes the change: the visit stays cancelled
// with what is owed on it (refund_due_minor), for the centre to settle.

export interface ChangeVisitDeps {
  cancel: (manageToken: string) => Promise<CancelledBooking>;
  /** Refunds through Stripe; returns the amount refunded. */
  refund: (
    paymentIntentId: string,
    amountMinor: number,
    reference: string,
  ) => Promise<number>;
  recordRefund: (
    paymentIntentId: string,
    refundedMinor: number,
  ) => Promise<unknown>;
  reschedule: (
    manageToken: string,
    startsAt: string,
  ) => Promise<RescheduledBooking>;
  notify: (change: VisitChange) => Promise<unknown>;
}

type Refused = { ok: false; code: BookingErrorCode };

function refused(error: unknown): Refused {
  if (error instanceof BookingError) return { ok: false, code: error.code };
  console.error("[booking] changing a visit failed:", error);
  return { ok: false, code: "unknown" };
}

export async function cancelVisit(
  manageToken: string,
  /** The calendar event's next version (moves so far + 1). */
  sequence: number,
  deps: ChangeVisitDeps,
): Promise<{ ok: true; refundMinor: number; refundFailed: boolean } | Refused> {
  let cancelled: CancelledBooking;
  try {
    cancelled = await deps.cancel(manageToken);
  } catch (error) {
    return refused(error);
  }
  return settleCancellation(cancelled, { manageToken, sequence }, deps);
}

/**
 * Cancelling by the centre (an admin, from the portal): always the money
 * back; the e-mail brings the client a new link.
 */
export async function cancelVisitAsCentre(
  appointmentId: string,
  deps: Omit<ChangeVisitDeps, "cancel" | "reschedule"> & {
    centreCancel: (appointmentId: string) => Promise<CentreCancelledVisit>;
  },
): Promise<{ ok: true; refundMinor: number; refundFailed: boolean } | Refused> {
  let cancelled: CentreCancelledVisit;
  try {
    cancelled = await deps.centreCancel(appointmentId);
  } catch (error) {
    return refused(error);
  }
  return settleCancellation(
    cancelled,
    { manageToken: null, sequence: cancelled.rescheduleCount + 1 },
    deps,
  );
}

async function settleCancellation(
  { reference, refundMinor, paymentIntentId }: CancelledBooking,
  { manageToken, sequence }: { manageToken: string | null; sequence: number },
  deps: Pick<ChangeVisitDeps, "refund" | "recordRefund" | "notify">,
): Promise<{ ok: true; refundMinor: number; refundFailed: boolean }> {
  let refundFailed = false;
  if (refundMinor > 0 && paymentIntentId) {
    try {
      const refunded = await deps.refund(
        paymentIntentId,
        refundMinor,
        reference,
      );
      await deps.recordRefund(paymentIntentId, refunded);
    } catch (error) {
      console.error(`[booking] refund for ${reference} failed:`, error);
      refundFailed = true;
    }
  }

  await deps.notify({
    kind: "cancelled",
    reference,
    manageToken,
    sequence,
    refundMinor,
  });
  return { ok: true, refundMinor, refundFailed };
}

export async function rescheduleVisit(
  manageToken: string,
  startsAt: string,
  deps: ChangeVisitDeps,
): Promise<{ ok: true; startsAt: string } | Refused> {
  let moved: RescheduledBooking;
  try {
    moved = await deps.reschedule(manageToken, startsAt);
  } catch (error) {
    return refused(error);
  }
  await deps.notify({
    kind: "rescheduled",
    reference: moved.reference,
    manageToken,
    sequence: moved.rescheduleCount,
  });
  return { ok: true, startsAt: moved.startsAt };
}
