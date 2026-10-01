// Paying later (docs/product/booking-plan.md, R11): a visit may be reserved
// and paid by 48 hours before it; closer than that (with under an hour left
// to pay) it is paid at once. The database's default
// (center_settings.payment_due_hours); it decides again on reserving.

export const PAYMENT_DUE_HOURS = 48;

const HOUR = 3_600_000;

/** When a visit reserved now must be paid by, or null: pay now. */
export function payLaterUntil(startsAt: string, now = new Date()) {
  const due = Date.parse(startsAt) - PAYMENT_DUE_HOURS * HOUR;
  return due > now.getTime() + HOUR ? new Date(due).toISOString() : null;
}
