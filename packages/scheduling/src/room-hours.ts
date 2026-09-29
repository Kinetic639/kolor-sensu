import { isoWeekday } from "./availability";
import { minutesToTime, timeToMinutes, type MinuteRange } from "./grid";

// A room's opening hours (weekly, per ISO weekday) and its date exceptions,
// as minutes of the local day. Specialists' windows in a room must fit its
// hours (the database refuses others, hint `room_closed`).

export interface OpeningHoursInterval {
  weekday: number;
  startsAt: string;
  endsAt: string;
}

export interface RoomDateException {
  date: string;
  type: "closed_all_day" | "blocked_interval" | "extra_available_interval";
  startsAt: string | null;
  endsAt: string | null;
}

const toRange = (from: string, to: string): MinuteRange => ({
  start: timeToMinutes(from),
  end: timeToMinutes(to) || 24 * 60,
});

/** Sorted, with overlapping and touching intervals joined. */
export function mergeIntervals(intervals: MinuteRange[]): MinuteRange[] {
  const merged: MinuteRange[] = [];
  for (const one of [...intervals].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && one.start <= last.end) last.end = Math.max(last.end, one.end);
    else merged.push({ ...one });
  }
  return merged;
}

function subtract(intervals: MinuteRange[], cut: MinuteRange) {
  return intervals.flatMap((one) => {
    if (cut.end <= one.start || cut.start >= one.end) return [one];
    const pieces: MinuteRange[] = [];
    if (cut.start > one.start)
      pieces.push({ start: one.start, end: cut.start });
    if (cut.end < one.end) pieces.push({ start: cut.end, end: one.end });
    return pieces;
  });
}

/** When the room is open on a date: its weekday's hours and exceptions. */
export function openIntervalsOn(
  date: string,
  hours: OpeningHoursInterval[],
  exceptions: RoomDateException[],
): MinuteRange[] {
  const weekday = isoWeekday(date);
  const today = exceptions.filter((one) => one.date === date);
  if (today.some((one) => one.type === "closed_all_day")) return [];

  let open = mergeIntervals(
    hours
      .filter((one) => one.weekday === weekday)
      .map((one) => toRange(one.startsAt, one.endsAt)),
  );
  for (const one of today) {
    if (!one.startsAt || !one.endsAt) continue;
    const range = toRange(one.startsAt, one.endsAt);
    open =
      one.type === "extra_available_interval"
        ? mergeIntervals([...open, range])
        : subtract(open, range);
  }
  return open;
}

/** The parts of the visible range outside the open intervals. */
export function closedIntervals(
  open: MinuteRange[],
  range: MinuteRange,
): MinuteRange[] {
  return mergeIntervals(open).reduce(subtract, [{ ...range }]);
}

/** How many minutes of the blocks fall inside the open intervals. */
export function overlapMinutes(blocks: MinuteRange[], open: MinuteRange[]) {
  let total = 0;
  for (const block of mergeIntervals(blocks)) {
    for (const one of open) {
      total += Math.max(
        0,
        Math.min(block.end, one.end) - Math.max(block.start, one.start),
      );
    }
  }
  return total;
}

const DAY_SHORT = ["Pn", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

/** Weekdays (1 = Monday), short, with runs of three or more as ranges: `Pn–Pt, Nd`. */
export function weekdaysLabel(days: number[]) {
  const runs: number[][] = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run && run.at(-1) === day - 1) run.push(day);
    else runs.push([day]);
  }
  return runs
    .flatMap((run) =>
      run.length >= 3
        ? [`${DAY_SHORT[run[0]! - 1]}–${DAY_SHORT[run.at(-1)! - 1]}`]
        : run.map((day) => DAY_SHORT[day - 1]!),
    )
    .join(", ");
}

/**
 * The week in one line, days with the same hours together:
 * `Pn–Pt 08:00–18:00 · Sob 09:00–13:00`. Null when the room has no hours.
 */
export function summarizeOpeningHours(
  hours: OpeningHoursInterval[],
): string | null {
  const byHours = new Map<string, number[]>();
  for (let day = 1; day <= 7; day += 1) {
    const text = mergeIntervals(
      hours
        .filter((one) => one.weekday === day)
        .map((one) => toRange(one.startsAt, one.endsAt)),
    )
      .map((one) => `${minutesToTime(one.start)}–${minutesToTime(one.end)}`)
      .join(", ");
    if (text) byHours.set(text, [...(byHours.get(text) ?? []), day]);
  }
  if (!byHours.size) return null;
  return [...byHours]
    .map(([text, days]) => `${weekdaysLabel(days)} ${text}`)
    .join(" · ");
}
