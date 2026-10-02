import { zonedInstant } from "@repo/scheduling";
import {
  BookingError,
  type BookingErrorCode,
  type CancelledBooking,
  type CentreCancelledVisit,
  type CentreMove,
  type CentreMovedVisit,
  type CentreRefund,
  type CentreSettlement,
  type RescheduledBooking,
  type VisitMode,
} from "@repo/supabase";
import type { VisitChange } from "./email/send-change";

// Changing a visit (docs/product/booking-plan.md, R8, R12): the client from
// its link, by the centre's rules; the centre (an admin, from the portal)
// its own way: cancelling at any time with the refund it chooses, giving
// money back later, moving a visit anywhere free. The database decides and
// changes the visit; then Stripe gives the money back and the client gets
// an e-mail. A refund or an e-mail that fails never undoes the change: the
// visit keeps what is owed on it (refund_due_minor), for the centre to
// settle.

export interface ChangeVisitDeps {
  cancel: (manageToken: string) => Promise<CancelledBooking>;
  /** Refunds through Stripe; returns all refunded on the payment so far. */
  refund: (
    paymentIntentId: string,
    amountMinor: number,
    options: { reference: string; idempotencyKey: string },
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
type Refunded = { ok: true; refundMinor: number; refundFailed: boolean };

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
): Promise<Refunded | Refused> {
  let cancelled: CancelledBooking;
  try {
    cancelled = await deps.cancel(manageToken);
  } catch (error) {
    return refused(error);
  }
  return settleCancellation(
    cancelled,
    { manageToken, sequence, reason: null },
    deps,
  );
}

export interface CentreRefundChoice {
  /** Null: all that is left of the payment. */
  refundMinor: number | null;
  reason: string | null;
}

/**
 * Cancelling by the centre (an admin, from the portal), at any time: the
 * refund the admin chose (all of it by default); the e-mail says why and
 * brings the client a new link.
 */
export async function cancelVisitAsCentre(
  appointmentId: string,
  { refundMinor = null, reason = null }: Partial<CentreRefundChoice>,
  deps: Pick<ChangeVisitDeps, "refund" | "recordRefund" | "notify"> & {
    centreCancel: (
      appointmentId: string,
      choice: CentreRefundChoice,
    ) => Promise<CentreCancelledVisit>;
  },
): Promise<Refunded | Refused> {
  let cancelled: CentreCancelledVisit;
  try {
    cancelled = await deps.centreCancel(appointmentId, { refundMinor, reason });
  } catch (error) {
    return refused(error);
  }
  return settleCancellation(
    cancelled,
    { manageToken: null, sequence: cancelled.rescheduleCount + 1, reason },
    deps,
  );
}

async function settleCancellation(
  { reference, refundMinor, paymentIntentId }: CancelledBooking,
  {
    manageToken,
    sequence,
    reason,
  }: { manageToken: string | null; sequence: number; reason: string | null },
  deps: Pick<ChangeVisitDeps, "refund" | "recordRefund" | "notify">,
): Promise<Refunded> {
  let refundFailed = false;
  if (refundMinor > 0 && paymentIntentId) {
    try {
      // One refund per cancelled visit, however often this runs.
      const refunded = await deps.refund(paymentIntentId, refundMinor, {
        reference,
        idempotencyKey: `cancel:${reference}`,
      });
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
    reason,
  });
  return { ok: true, refundMinor, refundFailed };
}

/**
 * The centre gives money back later (admins), up to what is left; once
 * Stripe has it, the client gets an e-mail with the amount and why.
 */
export async function refundVisitAsCentre(
  appointmentId: string,
  { refundMinor, reason }: { refundMinor: number; reason: string | null },
  deps: Pick<ChangeVisitDeps, "refund" | "recordRefund" | "notify"> & {
    centreRefund: (
      appointmentId: string,
      refundMinor: number,
      reason: string | null,
    ) => Promise<CentreRefund>;
  },
): Promise<Refunded | Refused> {
  let refund: CentreRefund;
  try {
    refund = await deps.centreRefund(appointmentId, refundMinor, reason);
  } catch (error) {
    return refused(error);
  }
  try {
    const refunded = await deps.refund(
      refund.paymentIntentId,
      refund.refundMinor,
      {
        reference: refund.reference,
        // This refund, not the next one of the same amount.
        idempotencyKey: `refund:${refund.reference}:${refund.refundedBeforeMinor}:${refund.refundMinor}`,
      },
    );
    await deps.recordRefund(refund.paymentIntentId, refunded);
  } catch (error) {
    console.error(`[booking] refund for ${refund.reference} failed:`, error);
    return { ok: true, refundMinor: refund.refundMinor, refundFailed: true };
  }
  await deps.notify({
    kind: "refunded",
    reference: refund.reference,
    refundMinor: refund.refundMinor,
    refundedBeforeMinor: refund.refundedBeforeMinor,
    reason,
  });
  return { ok: true, refundMinor: refund.refundMinor, refundFailed: false };
}

/**
 * The centre settles what is still owed (admins, R14): a refund Stripe
 * refused, or a payment for a visit that never was. Each settling is its own
 * refund in Stripe (a retry is not Stripe's remembered refusal); the
 * client is told once the money is on its way.
 */
export async function settleVisitAsCentre(
  appointmentId: string,
  deps: Pick<ChangeVisitDeps, "refund" | "recordRefund" | "notify"> & {
    centreSettle: (appointmentId: string) => Promise<CentreSettlement>;
  },
): Promise<Refunded | Refused> {
  let settlement: CentreSettlement;
  try {
    settlement = await deps.centreSettle(appointmentId);
  } catch (error) {
    return refused(error);
  }
  try {
    const refunded = await deps.refund(
      settlement.paymentIntentId,
      settlement.refundMinor,
      {
        reference: settlement.reference,
        idempotencyKey: `settle:${settlement.reference}:${settlement.settlementId}`,
      },
    );
    await deps.recordRefund(settlement.paymentIntentId, refunded);
  } catch (error) {
    console.error(`[booking] settling ${settlement.reference} failed:`, error);
    return {
      ok: true,
      refundMinor: settlement.refundMinor,
      refundFailed: true,
    };
  }
  await deps.notify({
    kind: "refunded",
    reference: settlement.reference,
    refundMinor: settlement.refundMinor,
    refundedBeforeMinor: settlement.refundedBeforeMinor,
    reason: null,
  });
  return { ok: true, refundMinor: settlement.refundMinor, refundFailed: false };
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

/**
 * The centre moves a visit (admins): to the centre's local date and time,
 * anywhere free; the e-mail brings the client a new link.
 */
export async function rescheduleVisitAsCentre(
  appointmentId: string,
  move: {
    date: string;
    time: string;
    mode: VisitMode;
    roomId: string | null;
    reason: string | null;
  },
  deps: Pick<ChangeVisitDeps, "notify"> & {
    timeZone: string;
    centreReschedule: (
      appointmentId: string,
      move: CentreMove,
    ) => Promise<CentreMovedVisit>;
  },
): Promise<{ ok: true; startsAt: string } | Refused> {
  let moved: CentreMovedVisit;
  try {
    moved = await deps.centreReschedule(appointmentId, {
      startsAt: zonedInstant(move.date, move.time, deps.timeZone).toISOString(),
      mode: move.mode,
      roomId: move.mode === "in_person" ? move.roomId : null,
      reason: move.reason,
    });
  } catch (error) {
    return refused(error);
  }
  await deps.notify({
    kind: "rescheduled",
    reference: moved.reference,
    manageToken: null,
    sequence: moved.sequence,
    reason: move.reason,
  });
  return { ok: true, startsAt: moved.startsAt };
}
