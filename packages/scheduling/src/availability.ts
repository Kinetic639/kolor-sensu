import { fromZonedTime } from "date-fns-tz";

// Specialist availability as stored (docs/product/booking-plan.md, "Reguły
// powtarzania"): one-offs and rules repeating on several weekdays every N
// weeks, with skipped dates (RFC 5545 RRULE / EXDATE), in the centre's local
// time, expanded here into windows of real instants. The recurrence
// arithmetic mirrors the database's private.availability_pattern_on.

export type AvailabilityMode = "in_person" | "online" | "hybrid";
export type AvailabilityRecurrence = "once" | "weekly";

export interface RecurrencePattern {
  /** ISO weekdays, 1 Monday … 7 Sunday. */
  weekdays: number[];
  /** Every N weeks, counted from the week of `validFrom`. */
  intervalWeeks: number;
  validFrom: string;
}

export interface AvailabilityRule extends RecurrencePattern {
  id: string;
  recurrence: AvailabilityRecurrence;
  /** Dates removed from the series. */
  exceptions: string[];
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

/** Whether the pattern (ignoring end and exceptions) falls on a date. */
function patternOn(pattern: RecurrencePattern, date: string) {
  if (!pattern.weekdays.includes(isoWeekday(date))) return false;
  if (date < pattern.validFrom) return false;
  const weeks =
    (dayNumber(mondayOf(date)) - dayNumber(mondayOf(pattern.validFrom))) / 7;
  return weeks % pattern.intervalWeeks === 0;
}

export function occursOn(
  rule: Pick<
    AvailabilityRule,
    | "recurrence"
    | "weekdays"
    | "intervalWeeks"
    | "validFrom"
    | "validUntil"
    | "exceptions"
  >,
  date: string,
) {
  if (rule.validUntil && date > rule.validUntil) return false;
  if (rule.exceptions.includes(date)) return false;
  if (rule.recurrence === "once") return date === rule.validFrom;
  return patternOn(rule, date);
}

/** The date of the `count`th occurrence of a pattern (1 = the first). */
export function nthOccurrenceDate(pattern: RecurrencePattern, count: number) {
  let found = 0;
  // At most one occurrence a month in the sparsest pattern.
  for (let offset = 0; offset <= count * 28; offset += 1) {
    const date = addDays(pattern.validFrom, offset);
    if (patternOn(pattern, date) && ++found === count) return date;
  }
  return null;
}

const WEEKDAY_PLURAL = [
  "poniedziałki",
  "wtorki",
  "środy",
  "czwartki",
  "piątki",
  "soboty",
  "niedziele",
];
const longDate = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function listInPolish(items: string[]) {
  return items.length > 1
    ? `${items.slice(0, -1).join(", ")} i ${items.at(-1)}`
    : (items[0] ?? "");
}

/** "Co 2 tygodnie we wtorki i czwartki, do 30 czerwca 2030", as calendars do. */
export function describeRecurrence(rule: {
  recurrence: AvailabilityRecurrence;
  weekdays: number[];
  intervalWeeks: number;
  validFrom: string;
  validUntil: string | null;
  occurrenceCount: number | null;
}) {
  if (rule.recurrence === "once") return "Jednorazowo";
  const days = [...rule.weekdays].sort((a, b) => a - b);
  const every =
    rule.intervalWeeks === 1
      ? "Co tydzień"
      : `Co ${rule.intervalWeeks} tygodnie`;
  let text: string;
  if (days.length === 7 && rule.intervalWeeks === 1) {
    text = "Codziennie";
  } else if (days.join() === "1,2,3,4,5") {
    text = `${every} w dni robocze (pn–pt)`;
  } else {
    const names = days.map((day) => WEEKDAY_PLURAL[day - 1]!);
    const preposition = /^w[^aeiouyąęó]/.test(names[0]!) ? "we" : "w";
    text = `${every} ${preposition} ${listInPolish(names)}`;
  }
  if (rule.occurrenceCount) return `${text}, ${rule.occurrenceCount} razy`;
  if (rule.validUntil) {
    return `${text}, do ${longDate.format(new Date(`${rule.validUntil}T12:00:00Z`))}`;
  }
  return text;
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
