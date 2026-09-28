import { fromZonedTime } from "date-fns-tz";

// Specialist availability as stored (docs/product/booking-plan.md, RD1):
// rules in the centre's local time, expanded here into windows of real
// instants. The recurrence arithmetic mirrors the database's
// private.availability_occurs_on, which checks the same rules on save.

export type AvailabilityMode = "in_person" | "online" | "hybrid";
export type AvailabilityRecurrence = "weekly" | "biweekly" | "once";

export interface AvailabilityRule {
  id: string;
  recurrence: AvailabilityRecurrence;
  /** ISO weekday: 1 Monday … 7 Sunday. */
  weekday: number;
  /** Local wall-clock time, `HH:MM` (seconds, if any, are ignored). */
  startsAt: string;
  endsAt: string;
  /** Local calendar dates, `YYYY-MM-DD`. */
  validFrom: string;
  validUntil: string | null;
  mode: AvailabilityMode;
  roomId: string | null;
}

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface AvailabilityWindow extends TimeInterval {
  ruleId: string;
  /** The local date the window belongs to. */
  date: string;
  mode: AvailabilityMode;
  roomId: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days since 1970-01-01 for a `YYYY-MM-DD` date (no time zone involved). */
function dayNumber(date: string) {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

function fromDayNumber(day: number) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  return fromDayNumber(dayNumber(date) + days);
}

/** ISO weekday of a local date: 1 Monday … 7 Sunday. */
export function isoWeekday(date: string) {
  // 1970-01-01 was a Thursday (4).
  return ((((dayNumber(date) + 3) % 7) + 7) % 7) + 1;
}

/** The Monday of the week a local date is in. */
export function mondayOf(date: string) {
  return addDays(date, 1 - isoWeekday(date));
}

export function occursOn(rule: AvailabilityRule, date: string) {
  if (isoWeekday(date) !== rule.weekday) return false;
  if (date < rule.validFrom) return false;
  if (rule.validUntil && date > rule.validUntil) return false;
  if (rule.recurrence !== "biweekly") return true;
  const weeks =
    (dayNumber(mondayOf(date)) - dayNumber(mondayOf(rule.validFrom))) / 7;
  return weeks % 2 === 0;
}

/** A local date and `HH:MM` time in a time zone, as an instant. */
export function zonedInstant(date: string, time: string, timeZone: string) {
  return fromZonedTime(`${date}T${time.slice(0, 5)}:00`, timeZone);
}

function subtract(
  windows: AvailabilityWindow[],
  cut: TimeInterval,
): AvailabilityWindow[] {
  return windows.flatMap((window) => {
    if (cut.end <= window.start || cut.start >= window.end) return [window];
    const pieces: AvailabilityWindow[] = [];
    if (cut.start > window.start) pieces.push({ ...window, end: cut.start });
    if (cut.end < window.end) pieces.push({ ...window, start: cut.end });
    return pieces;
  });
}

/**
 * The windows between two local dates (inclusive), in time order, with the
 * specialist's time off cut out.
 */
export function expandAvailability({
  rules,
  timeOff,
  from,
  to,
  timeZone,
}: {
  rules: AvailabilityRule[];
  timeOff: TimeInterval[];
  from: string;
  to: string;
  timeZone: string;
}): AvailabilityWindow[] {
  let windows: AvailabilityWindow[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    for (const rule of rules) {
      if (!occursOn(rule, date)) continue;
      windows.push({
        ruleId: rule.id,
        date,
        start: zonedInstant(date, rule.startsAt, timeZone),
        end: zonedInstant(date, rule.endsAt, timeZone),
        mode: rule.mode,
        roomId: rule.roomId,
      });
    }
  }
  for (const cut of timeOff) windows = subtract(windows, cut);
  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Time off entered as local dates: whole days (midnight to the midnight
 * after the last day) or from a time on the first day to a time on the last.
 */
export function localSpanToInterval(
  span: {
    fromDate: string;
    toDate: string;
    fromTime: string | null;
    toTime: string | null;
  },
  timeZone: string,
): TimeInterval {
  if (span.fromTime && span.toTime) {
    return {
      start: zonedInstant(span.fromDate, span.fromTime, timeZone),
      end: zonedInstant(span.toDate, span.toTime, timeZone),
    };
  }
  return {
    start: zonedInstant(span.fromDate, "00:00", timeZone),
    end: zonedInstant(addDays(span.toDate, 1), "00:00", timeZone),
  };
}
