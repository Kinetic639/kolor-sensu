// Paying later (docs/product/booking-plan.md, R11): a visit may be reserved
// and paid by `dueHours` before it (the centre's setting, 48 by default);
// closer than that (with under an hour left to pay) it is paid at once. The
// database decides again on reserving.

const HOUR = 3_600_000;

/** When a visit reserved now must be paid by, or null: pay now. */
export function payLaterUntil(
  startsAt: string,
  dueHours = 48,
  now = new Date(),
) {
  const due = Date.parse(startsAt) - dueHours * HOUR;
  return due > now.getTime() + HOUR ? new Date(due).toISOString() : null;
}
