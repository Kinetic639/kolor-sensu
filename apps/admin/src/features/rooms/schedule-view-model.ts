import type {
  AvailabilityMode,
  RoomAvailabilityRule,
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
  minutesToTime,
  openIntervalsOn,
  overlapMinutes,
  timeToMinutes,
  visibleRange,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  type MinuteRange,
  type OpeningHoursInterval,
  type RoomDateException,
} from "@repo/scheduling";
import { formatInTimeZone } from "date-fns-tz";

// The room's week (admin, Gabinety → Grafik): the hours specialists have
// taken in it, over its opening hours. Visits come with booking (RD2);
// until then a room is "reserved" by the specialists' availability.

export interface RoomScheduleWindow {
  id: string;
  ruleId: string;
  /** Minutes since local midnight. */
  start: number;
  end: number;
  timeLabel: string;
  specialistId: string;
  specialistName: string;
  initials: string;
  avatarUrl: string | null;
  accent: string;
  tint: string;
  mode: AvailabilityMode;
  note: string | null;
  recurrenceLabel: string;
  /** Not within the opening hours (saved before they changed). */
  outsideHours: boolean;
}

export interface RoomScheduleDay {
  date: string;
  label: string;
  sublabel: string;
  fullLabel: string;
  isToday: boolean;
  /** "08:00–18:00", "Zamknięte", or null when the room has no hours. */
  openLabel: string | null;
  reservedLabel: string | null;
  windows: RoomScheduleWindow[];
  closed: (MinuteRange & { label: string })[];
  /**
   * Not worth a column: the room is never open on this weekday and nobody
   * is in it. (A date closed by an exception stays, with its reason.)
   */
  hidden: boolean;
}

export interface RoomScheduleSpecialist {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  accent: string;
  hoursLabel: string;
}

export interface RoomScheduleViewModel {
  title: string;
  week: string;
  previousWeek: string;
  nextWeek: string;
  range: MinuteRange;
  days: RoomScheduleDay[];
  /** "sobota, niedziela": the hidden days, or null when all are shown. */
  hiddenDays: string | null;
  summary: {
    hasHours: boolean;
    openLabel: string | null;
    reservedLabel: string;
    freeLabel: string | null;
    /** Reserved share of the open hours; null without hours. */
    percent: number | null;
    windowCount: number;
    outsideCount: number;
  };
  specialists: RoomScheduleSpecialist[];
  upcoming: {
    id: string;
    label: string;
    specialistName: string;
    accent: string;
  }[];
}

const RESOURCE_COLOURS = 6;
const UPCOMING = 4;

const rangeLabel = (ranges: MinuteRange[]) =>
  ranges
    .map((one) => `${minutesToTime(one.start)}–${minutesToTime(one.end)}`)
    .join(", ");

export function mapRoomScheduleViewModel({
  rules,
  timeOff,
  hours,
  exceptions,
  week,
  now,
  timeZone,
}: {
  rules: RoomAvailabilityRule[];
  timeOff: SpecialistTimeOff[];
  hours: OpeningHoursInterval[];
  exceptions: (RoomDateException & { reason: string | null })[];
  /** The Monday of the shown week. */
  week: string;
  now: Date;
  timeZone: string;
}): RoomScheduleViewModel {
  const local = (instant: Date, pattern: string) =>
    formatInTimeZone(instant, timeZone, pattern);
  const minutesOf = (instant: Date) =>
    timeToMinutes(local(instant, "HH:mm")) || 24 * 60;
  const today = local(now, "yyyy-MM-dd");
  const weekEnd = addDays(week, 6);
  const hasHours = hours.length > 0;

  // Each specialist has a colour, in name order.
  const people = [
    ...new Map(
      rules.map((one) => [
        one.specialistId,
        {
          id: one.specialistId,
          name: one.specialistName,
          initials: one.specialistInitials,
          avatarUrl: one.specialistAvatarUrl,
        },
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  const colours = new Map(
    people.map((person, index) => {
      const n = (index % RESOURCE_COLOURS) + 1;
      return [
        person.id,
        { accent: `var(--resource-${n})`, tint: `var(--resource-${n}-soft)` },
      ];
    }),
  );
  const ruleById = new Map(rules.map((one) => [one.id, one]));

  // Everyone's windows this week, each with their own time off cut out.
  const windows = people
    .flatMap((person) =>
      expandAvailability({
        rules: rules.filter((one) => one.specialistId === person.id),
        timeOff: timeOff
          .filter((off) => off.specialistId === person.id)
          .map((off) => ({
            start: new Date(off.startsAt),
            end: new Date(off.endsAt),
          })),
        from: week,
        to: weekEnd,
        timeZone,
      }),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const openByDate = new Map(
    Array.from({ length: 7 }, (_, index) => {
      const date = addDays(week, index);
      return [date, hasHours ? openIntervalsOn(date, hours, exceptions) : null];
    }),
  );
  const range = visibleRange([
    ...windows.map((one) => ({
      start: minutesOf(one.start) % (24 * 60),
      end: minutesOf(one.end),
    })),
    ...[...openByDate.values()].flatMap((open) => open ?? []),
  ]);

  let reserved = 0;
  let reservedInside = 0;
  let openTotal = 0;
  let outsideCount = 0;
  const minutesBySpecialist = new Map<string, number>();

  const days: RoomScheduleDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(week, index);
    const open = openByDate.get(date)!;
    const closure = exceptions.find(
      (one) => one.date === date && one.type === "closed_all_day",
    );
    const dayWindows = windows
      .filter((one) => one.date === date)
      .map((one, windowIndex): RoomScheduleWindow => {
        const rule = ruleById.get(one.ruleId)!;
        const start = minutesOf(one.start) % (24 * 60);
        const end = minutesOf(one.end);
        const inside = open ? overlapMinutes([{ start, end }], open) : 0;
        const outsideHours = open !== null && inside < end - start;
        if (outsideHours) outsideCount += 1;
        reserved += end - start;
        reservedInside += inside;
        minutesBySpecialist.set(
          rule.specialistId,
          (minutesBySpecialist.get(rule.specialistId) ?? 0) + end - start,
        );
        return {
          id: `${one.ruleId}-${date}-${windowIndex}`,
          ruleId: one.ruleId,
          start,
          end,
          timeLabel: `${local(one.start, "HH:mm")} – ${local(one.end, "HH:mm")}`,
          specialistId: rule.specialistId,
          specialistName: rule.specialistName,
          initials: rule.specialistInitials,
          avatarUrl: rule.specialistAvatarUrl,
          ...colours.get(rule.specialistId)!,
          mode: one.mode,
          note: rule.note,
          recurrenceLabel: describeRecurrence(rule),
          outsideHours,
        };
      });
    if (open)
      openTotal += open.reduce((sum, one) => sum + one.end - one.start, 0);
    const dayReserved = dayWindows.reduce(
      (sum, one) => sum + one.end - one.start,
      0,
    );
    const closedLabel = closure
      ? closure.reason
        ? `Zamknięte: ${closure.reason}`
        : "Zamknięte"
      : "Gabinet zamknięty";

    return {
      date,
      label: WEEKDAY_SHORT[index]!,
      sublabel: formatDayMonth(date),
      fullLabel: `${WEEKDAY_NAMES[index]}, ${formatDate(date)}`,
      isToday: date === today,
      openLabel: open ? (open.length ? rangeLabel(open) : "Zamknięte") : null,
      reservedLabel: dayReserved ? formatHours(dayReserved) : null,
      windows: dayWindows,
      hidden:
        hasHours &&
        !hours.some((one) => one.weekday === index + 1) &&
        !open?.length &&
        !dayWindows.length,
      closed: open
        ? closedIntervals(open, range).map((one) => ({
            ...one,
            label: closedLabel,
          }))
        : [],
    };
  });

  const upcoming = days
    .flatMap((day) => day.windows.map((one) => ({ day, one })))
    .filter(
      ({ day, one }) =>
        day.date > today ||
        (day.date === today && one.end > timeToMinutes(local(now, "HH:mm"))),
    )
    .slice(0, UPCOMING)
    .map(({ day, one }) => ({
      id: one.id,
      label: `${day.label}, ${one.timeLabel}`,
      specialistName: one.specialistName,
      accent: one.accent,
    }));

  const hiddenDays = days
    .flatMap((day, index) =>
      day.hidden ? [WEEKDAY_NAMES[index]!.toLowerCase()] : [],
    )
    .join(", ");

  return {
    title: formatDateRange(week, weekEnd),
    hiddenDays: hiddenDays || null,
    week,
    previousWeek: addDays(week, -7),
    nextWeek: addDays(week, 7),
    range,
    days,
    summary: {
      hasHours,
      openLabel: hasHours ? formatHours(openTotal) : null,
      reservedLabel: formatHours(reserved),
      freeLabel: hasHours
        ? formatHours(Math.max(0, openTotal - reservedInside))
        : null,
      percent:
        hasHours && openTotal
          ? Math.round((reservedInside / openTotal) * 100)
          : hasHours
            ? 0
            : null,
      windowCount: windows.length,
      outsideCount,
    },
    specialists: people
      .filter((person) => minutesBySpecialist.has(person.id))
      .map((person) => ({
        ...person,
        ...colours.get(person.id)!,
        hoursLabel: formatHours(minutesBySpecialist.get(person.id)!),
      })),
    upcoming,
  };
}
