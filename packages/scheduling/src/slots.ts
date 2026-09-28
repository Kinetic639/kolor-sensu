import { formatInTimeZone } from "date-fns-tz";
import {
  addDays,
  zonedInstant,
  type AvailabilityMode,
  type AvailabilityWindow,
  type TimeInterval,
} from "./availability";

// Free visit times from availability windows (docs/product/booking-plan.md,
// R1). Visits start on the centre's clock grid (every `stepMinutes` from
// local midnight), must fit inside one window, and keep `bufferMinutes`
// after every visit, booked or new.

export interface FreeSlot {
  start: Date;
  end: Date;
  /** Local date and `HH:MM` of the start. */
  date: string;
  localTime: string;
  ruleId: string;
  roomId: string | null;
}

export interface FreeSlotsOptions {
  windows: AvailabilityWindow[];
  /** Visits already booked or held. */
  busy: TimeInterval[];
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  /** What the client wants; hybrid windows serve both. */
  mode: Exclude<AvailabilityMode, "hybrid">;
  now: Date;
  leadMinutes: number;
  horizonDays: number;
  timeZone: string;
}

const MINUTE_MS = 60 * 1000;

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function localMinutes(instant: Date, timeZone: string) {
  const [hours, minutes] = formatInTimeZone(instant, timeZone, "HH:mm")
    .split(":")
    .map(Number) as [number, number];
  return hours * 60 + minutes;
}

export function freeSlots({
  windows,
  busy,
  durationMinutes,
  bufferMinutes,
  stepMinutes,
  mode,
  now,
  leadMinutes,
  horizonDays,
  timeZone,
}: FreeSlotsOptions): FreeSlot[] {
  const earliest = now.getTime() + leadMinutes * MINUTE_MS;
  const latest = now.getTime() + horizonDays * 24 * 60 * MINUTE_MS;
  const duration = durationMinutes * MINUTE_MS;
  const buffer = bufferMinutes * MINUTE_MS;
  const occupied = busy.map((visit) => ({
    start: visit.start.getTime(),
    end: visit.end.getTime() + buffer,
  }));

  const slots: FreeSlot[] = [];
  for (const window of windows) {
    if (window.mode !== "hybrid" && window.mode !== mode) continue;
    const first =
      Math.ceil(localMinutes(window.start, timeZone) / stepMinutes) *
      stepMinutes;
    for (let minutes = first; minutes < 24 * 60; minutes += stepMinutes) {
      const localTime = minutesToTime(minutes);
      const start = zonedInstant(window.date, localTime, timeZone).getTime();
      const end = start + duration;
      if (end > window.end.getTime()) break;
      if (start < window.start.getTime() || start < earliest || start > latest)
        continue;
      const clashes = occupied.some(
        (visit) => start < visit.end && visit.start < end + buffer,
      );
      if (clashes) continue;
      slots.push({
        start: new Date(start),
        end: new Date(end),
        date: window.date,
        localTime,
        ruleId: window.ruleId,
        roomId: window.roomId,
      });
    }
  }
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
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
