import type {
  AvailabilityMode,
  RoomOccupancy,
  SpecialistAvailabilityRule,
  SpecialistTimeOff,
} from "@repo/contracts";
import {
  addDays,
  closedIntervals,
  describeRecurrence,
  expandAvailability,
  formatDate,
  formatDateRange,
  formatDayMonth,
  formatHours,
  formatWeekday,
  openIntervalsOn,
  summarizeOpeningHours,
  timeToMinutes,
  visibleRange,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  zonedInstant,
  type OpeningHoursInterval,
  type RoomDateException,
} from "@repo/scheduling";
import { formatInTimeZone } from "date-fns-tz";
import type {
  AvailabilityViewModel,
  CalendarDayViewModel,
  RoomViewModel,
  RuleItemViewModel,
} from "./types";

export { formatDate, formatDateRange };

const WEEKDAYS = WEEKDAY_NAMES;
const WEEKDAYS_SHORT = WEEKDAY_SHORT;
const RESOURCE_COLOURS = 6;

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
    return `${formatDate(start.date)}, ${start.time}–${end.time}`;
  }
  return `${formatDate(start.date)}, ${start.time} – ${formatDate(end.date)}, ${end.time}`;
}

const timeRange = (start: string, end: string) => `${start} – ${end}`;

/** "Poniedziałek", "Poniedziałek – piątek", "Codziennie" or "Pon, Śr, Pt". */
function daysTitle(weekdays: number[]) {
  if (weekdays.length === 1) return WEEKDAYS[weekdays[0]! - 1]!;
  if (weekdays.length === 7) return "Codziennie";
  if (weekdays.join() === "1,2,3,4,5") return "Poniedziałek – piątek";
  return weekdays.map((day) => WEEKDAYS_SHORT[day - 1]!).join(", ");
}

/** "1 blok innych specjalistów", "3 bloki …", "5 bloków …". */
function othersBlocksLabel(count: number) {
  if (count === 1) return "1 blok innych specjalistów";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return `${count} ${few ? "bloki" : "bloków"} innych specjalistów`;
}

/** "1 termin pominięty", "2 terminy pominięte", "5 terminów pominiętych". */
function skippedLabel(count: number) {
  if (count === 1) return "1 termin pominięty";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return few ? `${count} terminy pominięte` : `${count} terminów pominiętych`;
}

function colours(
  rule: Pick<SpecialistAvailabilityRule, "mode" | "roomId">,
  roomIndex: Map<string, number>,
) {
  if (rule.mode === "online" || !rule.roomId) {
    return { accent: "var(--info)", tint: "var(--info-soft)" };
  }
  const index = ((roomIndex.get(rule.roomId) ?? 0) % RESOURCE_COLOURS) + 1;
  return {
    accent: `var(--resource-${index})`,
    tint: `var(--resource-${index}-soft)`,
  };
}

function placeLabel(
  rule: Pick<SpecialistAvailabilityRule, "mode" | "roomId">,
  roomNames: Map<string, string>,
) {
  if (rule.mode === "online" || !rule.roomId) return "Online";
  return roomNames.get(rule.roomId) ?? "Gabinet (nieaktywny)";
}

function matchesMode(
  mode: AvailabilityMode,
  filter: "stacjonarnie" | "online" | null,
) {
  if (!filter || mode === "hybrid") return true;
  return filter === "online" ? mode === "online" : mode === "in_person";
}

export function mapAvailabilityViewModel({
  rules,
  timeOff,
  rooms,
  now,
  week,
  filters,
  timeZone,
  specialistId,
  occupancy = [],
  room = null,
}: {
  rules: SpecialistAvailabilityRule[];
  timeOff: SpecialistTimeOff[];
  rooms: { id: string; name: string }[];
  now: Date;
  /** The Monday of the shown week. */
  week: string;
  filters: { day: number | null; mode: "stacjonarnie" | "online" | null };
  timeZone: string;
  /** Who is signed in: their own hours in a room are not "taken". */
  specialistId?: string;
  /** Everyone's hours in every room this week. */
  occupancy?: RoomOccupancy[];
  /** The room shown over the calendar, with its opening hours. */
  room?: {
    id: string;
    hours: OpeningHoursInterval[];
    exceptions: RoomDateException[];
  } | null;
}): AvailabilityViewModel {
  const today = local(now, timeZone).date;
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const roomIndex = new Map(rooms.map((room, index) => [room.id, index]));
  const roomViews: RoomViewModel[] = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    accent: colours({ mode: "in_person", roomId: room.id }, roomIndex).accent,
  }));
  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));

  // The calendar: this week's windows, with time off cut out.
  const weekEnd = addDays(week, 6);
  const offIntervals = timeOff.map((off) => ({
    start: new Date(off.startsAt),
    end: new Date(off.endsAt),
    off,
  }));
  const windows = expandAvailability({
    rules,
    timeOff: offIntervals,
    from: week,
    to: weekEnd,
    timeZone,
  });
  const minutesOf = (instant: Date) =>
    timeToMinutes(local(instant, timeZone).time);
  // Other specialists' hours: in the chosen room they are shown, and in
  // any room they tell the forms which rooms are free.
  const othersOccupancy = occupancy.filter(
    (one) => one.specialistId !== specialistId,
  );
  const roomName = room ? (roomNames.get(room.id) ?? "Gabinet") : null;
  const roomBusy = room
    ? othersOccupancy.filter((one) => one.roomId === room.id)
    : [];
  const roomOpen = new Map(
    room && room.hours.length
      ? Array.from({ length: 7 }, (_, index) => {
          const date = addDays(week, index);
          return [date, openIntervalsOn(date, room.hours, room.exceptions)];
        })
      : [],
  );
  const busySpan = (one: RoomOccupancy) => ({
    start: timeToMinutes(one.startsAt),
    end: timeToMinutes(one.endsAt) || 24 * 60,
  });

  const range = visibleRange([
    ...windows.map((window) => ({
      start: minutesOf(window.start),
      end: minutesOf(window.end) || 24 * 60,
    })),
    ...roomBusy.map(busySpan),
    ...[...roomOpen.values()].flat(),
  ]);

  let weekMinutes = 0;
  const days: CalendarDayViewModel[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(week, index);
    const dayStart = zonedInstant(date, "00:00", timeZone);
    const dayEnd = zonedInstant(addDays(date, 1), "00:00", timeZone);
    const dayWindows = windows
      .filter((window) => window.date === date)
      .map((window, windowIndex) => {
        const rule = ruleById.get(window.ruleId)!;
        const recurring = rule.recurrence === "weekly";
        const start = minutesOf(window.start);
        const end = minutesOf(window.end) || 24 * 60;
        return {
          id: `${window.ruleId}-${date}-${windowIndex}`,
          ruleId: window.ruleId,
          start,
          end,
          timeLabel: timeRange(
            local(window.start, timeZone).time,
            local(window.end, timeZone).time,
          ),
          placeLabel: placeLabel(window, roomNames),
          mode: window.mode,
          ...colours(window, roomIndex),
          note: rule.note,
          recurring,
          recurrenceLabel: describeRecurrence(rule),
        };
      });
    const minutes = dayWindows.reduce(
      (sum, one) => sum + one.end - one.start,
      0,
    );
    weekMinutes += minutes;
    return {
      date,
      label: WEEKDAYS_SHORT[index]!,
      sublabel: formatDayMonth(date),
      fullLabel: `${WEEKDAYS[index]}, ${formatDate(date)}`,
      isToday: date === today,
      hoursLabel: minutes ? formatHours(minutes) : null,
      windows: dayWindows,
      room: {
        busy: roomBusy
          .filter((one) => one.date === date)
          .map((one) => {
            const timeLabel = timeRange(one.startsAt, one.endsAt);
            return {
              id: `${one.roomId}-${date}-${timeToMinutes(one.startsAt)}-${one.specialistId}`,
              ...busySpan(one),
              timeLabel,
              specialistName: one.specialistName,
              label: `${roomName} zajęty: ${one.specialistName}, ${timeLabel}`,
            };
          }),
        closed: roomOpen.has(date)
          ? closedIntervals(roomOpen.get(date)!, range).map((one) => ({
              ...one,
              label: `${roomName} zamknięty`,
            }))
          : [],
      },
      timeOff: offIntervals
        .filter((off) => off.start < dayEnd && off.end > dayStart)
        .map((off) => ({
          id: `${off.off.id}-${date}`,
          start: Math.max(
            range.start,
            off.start > dayStart ? minutesOf(off.start) : 0,
          ),
          end: Math.min(
            range.end,
            off.end < dayEnd ? minutesOf(off.end) : 24 * 60,
          ),
          label: off.off.reason
            ? `Nieobecność: ${off.off.reason}`
            : "Nieobecność",
        }))
        .filter((off) => off.end > off.start),
    };
  });

  // The rules: current windows (not ended), recurring and one-day.
  const current = rules
    .filter((rule) =>
      rule.recurrence === "once"
        ? rule.validFrom >= today
        : !rule.validUntil || rule.validUntil >= today,
    )
    .sort(
      (a, b) =>
        a.weekdays[0]! - b.weekdays[0]! ||
        a.validFrom.localeCompare(b.validFrom) ||
        a.startsAt.localeCompare(b.startsAt),
    );
  const dayCounts: Record<number, number> = {};
  for (const rule of current) {
    for (const day of rule.weekdays) dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }

  const items: RuleItemViewModel[] = current
    .filter(
      (rule) =>
        (filters.day === null || rule.weekdays.includes(filters.day)) &&
        matchesMode(rule.mode, filters.mode),
    )
    .map((rule) => {
      const minutes = timeToMinutes(rule.endsAt) - timeToMinutes(rule.startsAt);
      const once = rule.recurrence === "once";
      return {
        id: rule.id,
        title: once ? formatDate(rule.validFrom) : daysTitle(rule.weekdays),
        subtitle: once
          ? formatWeekday(rule.validFrom)
          : [
              rule.intervalWeeks > 1 || rule.validFrom > today
                ? `od ${formatDate(rule.validFrom)}`
                : null,
              rule.exceptions.length
                ? skippedLabel(rule.exceptions.length)
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || null,
        recurrenceLabel: describeRecurrence(rule),
        timeLabel: timeRange(rule.startsAt, rule.endsAt),
        durationLabel: formatHours(minutes),
        placeLabel: placeLabel(rule, roomNames),
        mode: rule.mode,
        accent: colours(rule, roomIndex).accent,
        note: rule.note,
        // Visits come with booking (RD2); until then nothing is booked.
        occupancy: {
          percent: 0,
          bookedLabel: "0 godz. zajęte (0 wizyt)",
          freeLabel: `${formatHours(minutes)} wolne`,
        },
        canCopyToWorkdays: !once && rule.weekdays.join() !== "1,2,3,4,5",
        rule,
      };
    });

  const weekly = formatHours(weekMinutes);
  return {
    rooms: roomViews,
    calendar: {
      title: formatDateRange(week, weekEnd),
      week,
      previousWeek: addDays(week, -7),
      nextWeek: addDays(week, 7),
      range,
      days,
      stats: { available: weekly, booked: formatHours(0), free: weekly },
      roomFocus: room
        ? {
            id: room.id,
            name: roomName!,
            accent: colours({ mode: "in_person", roomId: room.id }, roomIndex)
              .accent,
            hoursLabel: summarizeOpeningHours(room.hours),
            busyLabel: roomBusy.length
              ? othersBlocksLabel(roomBusy.length)
              : null,
          }
        : null,
      othersOccupancy,
    },
    rules: {
      items,
      total: current.length,
      dayCounts,
      metrics: { weekly, booked: formatHours(0), free: weekly },
    },
    timeOff: timeOff
      .filter((off) => new Date(off.endsAt) > now)
      .map((off) => ({
        id: off.id,
        label: formatTimeOff(off, timeZone),
        reason: off.reason,
      })),
  };
}
