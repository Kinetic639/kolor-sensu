import type {
  SpecialistAvailabilityRule,
  SpecialistTimeOff,
} from "@repo/contracts";
import {
  addDays,
  expandAvailability,
  zonedInstant,
  type TimeInterval,
} from "@repo/scheduling";
import { formatInTimeZone } from "date-fns-tz";
import type { AvailabilityViewModel, RuleViewModel } from "./types";

const WEEKDAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

// Local calendar dates are formatted at UTC noon: no time zone can move them.
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);
const dayMonth = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekdayLong = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  timeZone: "UTC",
});
const weekdayShort = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  timeZone: "UTC",
});

export function formatDate(date: string) {
  return fullDate.format(atNoon(date));
}

/** `7–13 stycznia 2030`, `30 stycznia – 2 lutego 2030`, … */
export function formatDateRange(from: string, to: string) {
  if (from === to) return formatDate(from);
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8))}–${formatDate(to)}`;
  }
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return `${dayMonth.format(atNoon(from))} – ${formatDate(to)}`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
}

const timeRange = (start: string, end: string) => `${start}–${end}`;

function local(instant: Date | string, timeZone: string) {
  return {
    date: formatInTimeZone(instant, timeZone, "yyyy-MM-dd"),
    time: formatInTimeZone(instant, timeZone, "HH:mm"),
  };
}

export function formatTimeOff(timeOff: SpecialistTimeOff, timeZone: string) {
  const start = local(timeOff.startsAt, timeZone);
  const end = local(timeOff.endsAt, timeZone);
  if (start.time === "00:00" && end.time === "00:00") {
    return formatDateRange(start.date, addDays(end.date, -1));
  }
  if (start.date === end.date) {
    return `${formatDate(start.date)}, ${timeRange(start.time, end.time)}`;
  }
  return `${formatDate(start.date)}, ${start.time} – ${formatDate(end.date)}, ${end.time}`;
}

function placeLabel(
  rule: Pick<SpecialistAvailabilityRule, "mode" | "roomId">,
  roomNames: Map<string, string>,
) {
  if (rule.mode === "online" || !rule.roomId) return "Online";
  return roomNames.get(rule.roomId) ?? "Gabinet (nieaktywny)";
}

function recurrenceLabel(rule: SpecialistAvailabilityRule, today: string) {
  const parts = [
    rule.recurrence === "biweekly" ? "Co 2 tygodnie" : "Co tydzień",
  ];
  if (rule.recurrence === "biweekly" || rule.validFrom > today) {
    parts.push(`od ${formatDate(rule.validFrom)}`);
  }
  if (rule.validUntil) parts.push(`do ${formatDate(rule.validUntil)}`);
  return parts.join(", ");
}

function hoursLabel(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(".", ",")} h`;
}

export function mapAvailabilityViewModel({
  rules,
  timeOff,
  rooms,
  now,
  week,
  timeZone,
}: {
  rules: SpecialistAvailabilityRule[];
  timeOff: SpecialistTimeOff[];
  rooms: { id: string; name: string }[];
  now: Date;
  /** The Monday of the previewed week. */
  week: string;
  timeZone: string;
}): AvailabilityViewModel {
  const today = local(now, timeZone).date;
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const toView = (rule: SpecialistAvailabilityRule): RuleViewModel => ({
    id: rule.id,
    timeLabel: timeRange(rule.startsAt, rule.endsAt),
    placeLabel: placeLabel(rule, roomNames),
    mode: rule.mode,
    note: rule.note,
    rule,
  });

  const recurring = rules.filter(
    (rule) =>
      rule.recurrence !== "once" &&
      (!rule.validUntil || rule.validUntil >= today),
  );
  const weekly = WEEKDAYS.map((label, index) => ({
    weekday: index + 1,
    label,
    windows: recurring
      .filter((rule) => rule.weekday === index + 1)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((rule) => ({
        ...toView(rule),
        recurrenceLabel: recurrenceLabel(rule, today),
      })),
  }));

  const oneOff = rules
    .filter((rule) => rule.recurrence === "once" && rule.validFrom >= today)
    .sort((a, b) =>
      `${a.validFrom}${a.startsAt}`.localeCompare(
        `${b.validFrom}${b.startsAt}`,
      ),
    )
    .map((rule) => ({
      ...toView(rule),
      label: `${weekdayLong.format(atNoon(rule.validFrom))}, ${formatDate(rule.validFrom)}`,
    }));

  const intervals: (TimeInterval & { off: SpecialistTimeOff })[] = timeOff.map(
    (off) => ({
      start: new Date(off.startsAt),
      end: new Date(off.endsAt),
      off,
    }),
  );
  const weekEnd = addDays(week, 6);
  const windows = expandAvailability({
    rules: rules.map((rule) => ({ ...rule })),
    timeOff: intervals,
    from: week,
    to: weekEnd,
    timeZone,
  });

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(week, index);
    const dayStart = zonedInstant(date, "00:00", timeZone);
    const dayEnd = zonedInstant(addDays(date, 1), "00:00", timeZone);
    return {
      date,
      label: `${weekdayShort.format(atNoon(date))} ${Number(date.slice(8))}.${date.slice(5, 7)}`,
      isToday: date === today,
      windows: windows
        .filter((window) => window.date === date)
        .map((window, windowIndex) => ({
          id: `${window.ruleId}-${windowIndex}`,
          timeLabel: timeRange(
            local(window.start, timeZone).time,
            local(window.end, timeZone).time,
          ),
          placeLabel: placeLabel(window, roomNames),
          mode: window.mode,
        })),
      timeOff: intervals
        .filter((off) => off.start < dayEnd && off.end > dayStart)
        .map((off) => {
          const whole = off.start <= dayStart && off.end >= dayEnd;
          const from =
            off.start > dayStart ? local(off.start, timeZone).time : "00:00";
          const to = off.end < dayEnd ? local(off.end, timeZone).time : "24:00";
          return {
            id: off.off.id,
            label: whole ? "Cały dzień" : timeRange(from, to),
            reason: off.off.reason,
          };
        }),
    };
  });

  const minutes = windows.reduce(
    (sum, window) =>
      sum + (window.end.getTime() - window.start.getTime()) / 60000,
    0,
  );

  return {
    weekly,
    oneOff,
    timeOff: timeOff
      .filter((off) => new Date(off.endsAt) > now)
      .map((off) => ({
        id: off.id,
        label: formatTimeOff(off, timeZone),
        reason: off.reason,
      })),
    preview: {
      title: `Tydzień ${formatDateRange(week, weekEnd)}`,
      previousWeek: addDays(week, -7),
      nextWeek: addDays(week, 7),
      days,
      hoursLabel: hoursLabel(minutes),
    },
    rooms,
  };
}
