import type { BookingWindow, GuestBooking } from "@repo/supabase";

// What the client may still change themselves (docs/product/booking-plan.md,
// R8), by the centre's settings: cancelling is always possible before the
// visit, with the money back only until cancellationWindowHours before it;
// moving until rescheduleWindowHours before, at most maxSelfReschedules
// times. The database checks the same rules again when they act.

export type ChangePolicy = Pick<
  BookingWindow,
  "cancellationWindowHours" | "rescheduleWindowHours" | "maxSelfReschedules"
>;

export interface VisitChanges {
  cancel: {
    allowed: boolean;
    /** Cancelling now gives the money back. */
    refund: boolean;
    refundUntil: string;
  };
  reschedule: {
    allowed: boolean;
    until: string;
    remaining: number;
    /** Why not: the visit's state, the centre's limit, or too late. */
    blockedBy: "status" | "limit" | "window" | null;
  };
}

const HOUR = 3_600_000;

export function visitChanges(
  visit: Pick<
    GuestBooking,
    "status" | "startsAt" | "rescheduleCount" | "priceMinor"
  >,
  policy: ChangePolicy,
  now = new Date(),
): VisitChanges {
  const start = Date.parse(visit.startsAt);
  const refundUntil = start - policy.cancellationWindowHours * HOUR;
  const rescheduleUntil = start - policy.rescheduleWindowHours * HOUR;
  const upcoming = visit.status === "confirmed" && now.getTime() < start;
  const remaining = Math.max(
    0,
    policy.maxSelfReschedules - visit.rescheduleCount,
  );
  const blockedBy = !upcoming
    ? "status"
    : remaining === 0
      ? "limit"
      : now.getTime() > rescheduleUntil
        ? "window"
        : null;

  return {
    cancel: {
      allowed: upcoming,
      refund: upcoming && visit.priceMinor > 0 && now.getTime() <= refundUntil,
      refundUntil: new Date(refundUntil).toISOString(),
    },
    reschedule: {
      allowed: blockedBy === null,
      until: new Date(rescheduleUntil).toISOString(),
      remaining,
      blockedBy,
    },
  };
}
