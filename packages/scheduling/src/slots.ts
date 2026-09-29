import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "./availability";

// Free visit times (docs/product/booking-plan.md, R1). The database works
// them out (`list_free_slots`: availability, time off, room closures, other
// visits, notice, horizon), so the list and the hold agree; here they are
// only read in the centre's time zone and laid out by day.

export interface FreeSlot {
  start: Date;
  end: Date;
  /** Local date and `HH:MM` of the start. */
  date: string;
  localTime: string;
}

/** Rows of `list_free_slots`, in the centre's time zone. */
export function toFreeSlots(
  rows: { starts_at: string; ends_at: string }[],
  timeZone: string,
): FreeSlot[] {
  return rows.map((row) => {
    const start = new Date(row.starts_at);
    return {
      start,
      end: new Date(row.ends_at),
      date: formatInTimeZone(start, timeZone, "yyyy-MM-dd"),
      localTime: formatInTimeZone(start, timeZone, "HH:mm"),
    };
  });
}

export interface SlotDay {
  date: string;
  slots: FreeSlot[];
}

/** Every local date from `from` to `to` (inclusive) with its free slots. */
export function groupSlotsByDay(
  slots: FreeSlot[],
  from: string,
  to: string,
): SlotDay[] {
  const days: SlotDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.push({ date, slots: slots.filter((slot) => slot.date === date) });
  }
  return days;
}
