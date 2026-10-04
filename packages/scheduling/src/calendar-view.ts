import { formatInTimeZone } from "date-fns-tz";
import {
  addDays,
  expandAvailability,
  isoWeekday,
  type AvailabilityRule,
} from "./availability";
import { minutesToTime, timeToMinutes, type MinuteRange } from "./grid";
import { formatDayMonth, WEEKDAY_SHORT } from "./labels";
import {
  mergeIntervals,
  openIntervalsOn,
  type OpeningHoursInterval,
  type RoomDateException,
} from "./room-hours";
import type { VisitLike } from "./visits";

// The centre's calendar (docs/product/scheduling-ui-plan.md, K5), after the
// AI Studio reference: a day with a column per specialist or room, a week
// comparing everyone in narrow lanes, and a specialist's own week.
// Availability is the calm background in its room's colour, blocked time
// (time off, a closed room) is hatched, visits are the cards over it; each
// column sums up its hours, visits and occupancy. Everything is in minutes
// since the centre's local midnight; the UI places it.

export interface CalendarPerson {
  id: string;
  name: string;
  /** The professional title, e.g. "Psychoterapeutka CBT". */
  title: string | null;
  avatarUrl: string | null;
  color: string | null;
}

export interface CalendarRoom {
  id: string;
  name: string;
  color: string | null;
  locationId: string | null;
  /** Weekly opening hours; none: open whenever someone works there. */
  hours: OpeningHoursInterval[];
  exceptions: (RoomDateException & { reason: string | null })[];
}

/** One availability window of a specialist, in a room or online. */
export interface CalendarWindow {
  id: string;
  specialistId: string;
  /** A room's id, or "online". */
  placeId: string;
  start: Date;
  end: Date;
}

/** Time off where the specialist would otherwise have worked. */
export interface CalendarTimeOff {
  specialistId: string;
  start: Date;
  end: Date;
  reason: string | null;
}

export type CalendarPerspective = "specialists" | "rooms";

/** Where something happens: a room, online, or in person without a room. */
export interface CalendarPlace {
  id: string;
  name: string;
  /** `G1`, `GZ`, `ONL`. */
  short: string;
  color: string | null;
  online: boolean;
}

export interface Occupancy {
  visitCount: number;
  bookedMinutes: number;
  availableMinutes: number;
  /** Rounded to a tenth. */
  bookedHours: number;
  availableHours: number;
  freeHours: number;
  /** Not capped: over 100 is more booked than available. */
  percent: number;
  overbooked: boolean;
  overMinutes: number;
}

export interface AvailabilitySlot extends MinuteRange {
  key: string;
  /** `08:00–16:00` */
  time: string;
  place: CalendarPlace;
  /** Starts where the one before ends (the chip then hangs below). */
  adjacentToPrevious: boolean;
  label: string;
}

export interface BlockedSlot extends MinuteRange {
  key: string;
  /** `17:00 – 18:00` */
  time: string;
  label: string;
}

export interface VisitSlot extends MinuteRange {
  key: string;
  visitId: string;
  minutes: number;
  /** Where all the time it holds ends (the time after it too). */
  heldEnd: number;
  /** `09:00 – 10:30` */
  time: string;
  startTime: string;
  client: string;
  clientInitials: string;
  service: string;
  place: CalendarPlace;
  person: {
    id: string;
    name: string;
    initials: string;
    avatarUrl: string | null;
  };
  /** Booked, not paid yet. */
  pending: boolean;
  /** Not what the search asks for. */
  dimmed: boolean;
  label: string;
}

export interface CalendarColumn {
  key: string;
  kind: "specialist" | "room" | "online" | "day";
  date: string;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  initials: string;
  /** A room's code, a person's first name: for narrow lanes. */
  short: string;
  color: string | null;
  colorSeed: string;
  isToday: boolean;
  /** `08:00 – 18:00`: the first to the last available hour. */
  hours: string | null;
  /** Why a room is closed all day. */
  closed: string | null;
  /** Nothing available and nothing booked (or closed). */
  unavailable: boolean;
  occupancy: Occupancy;
  availability: AvailabilitySlot[];
  blocked: BlockedSlot[];
  visits: VisitSlot[];
}

export interface CalendarNow {
  minute: number;
  label: string;
}

export interface CalendarDayView {
  date: string;
  range: MinuteRange;
  now: CalendarNow | null;
  columns: CalendarColumn[];
}

export interface SummaryResource {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string | null;
  colorSeed: string;
}

export interface SummaryItem extends SummaryResource {
  closed: boolean;
  occupancy: Occupancy;
}

export interface ComparisonSummary {
  visitCount: number;
  occupancy: Occupancy;
  highest: (SummaryResource & { percent: number }) | null;
  lowest: (SummaryResource & { percent: number }) | null;
  items: SummaryItem[];
}

export interface WeekDayGroup {
  date: string;
  /** `Pon, 30` */
  label: string;
  isToday: boolean;
  occupancy: Occupancy;
  lanes: CalendarColumn[];
}

export interface CalendarWeekView {
  from: string;
  to: string;
  range: MinuteRange;
  now: CalendarNow | null;
  days: WeekDayGroup[];
  summary: ComparisonSummary;
}

export interface PersonalWeekView {
  from: string;
  to: string;
  range: MinuteRange;
  now: CalendarNow | null;
  columns: CalendarColumn[];
  summary: {
    visitCount: number;
    occupancy: Occupancy;
    /** The next visits not finished yet (`day`: `Pon, 5 paź`). */
    upcoming: (VisitSlot & { day: string; date: string })[];
  };
}

const DAY = 24 * 60;
const ONLINE: CalendarPlace = {
  id: "online",
  name: "Online",
  short: "ONL",
  color: null,
  online: true,
};
const IN_PERSON: CalendarPlace = {
  id: "stacjonarnie",
  name: "Stacjonarnie",
  short: "ST",
  color: null,
  online: false,
};

/** `1 wizyta`, `2 wizyty`, `5 wizyt`. */
export function visitsLabel(count: number) {
  if (count === 1) return "1 wizyta";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return `${count} ${few ? "wizyty" : "wizyt"}`;
}

/** `Gabinet 1` → `G1`, `Gabinet Zielony` → `GZ`, `Online` → `ONL`. */
export function placeShort(name: string) {
  if (name === "Online") return "ONL";
  const words = name.split(/\s+/).filter(Boolean);
  const number = /(\d+)/.exec(name);
  if (number) return `${words[0]![0]!.toUpperCase()}${number[1]}`;
  return words
    .slice(0, 3)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** `Ewa Kowalska` → `EK`. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts.at(-1)![0]}`.toUpperCase();
}

const tenth = (minutes: number) => Math.round((minutes / 60) * 10) / 10;
const lengthOf = (ranges: MinuteRange[]) =>
  ranges.reduce((sum, one) => sum + Math.max(0, one.end - one.start), 0);

function occupancyFrom(
  visitCount: number,
  bookedMinutes: number,
  availableMinutes: number,
): Occupancy {
  const percent = availableMinutes
    ? Math.round((bookedMinutes / availableMinutes) * 100)
    : bookedMinutes
      ? 100
      : 0;
  return {
    visitCount,
    bookedMinutes,
    availableMinutes,
    bookedHours: tenth(bookedMinutes),
    availableHours: tenth(availableMinutes),
    freeHours: Math.max(0, tenth(availableMinutes - bookedMinutes)),
    percent,
    overbooked: percent > 100 || (!availableMinutes && bookedMinutes > 0),
    overMinutes: Math.max(0, bookedMinutes - availableMinutes),
  };
}

/** Booked time over available time, as the reference sums it. */
export function occupancyOf(
  visits: MinuteRange[],
  availability: MinuteRange[],
): Occupancy {
  return occupancyFrom(visits.length, lengthOf(visits), lengthOf(availability));
}

function sumOccupancy(list: Occupancy[]) {
  return occupancyFrom(
    list.reduce((sum, one) => sum + one.visitCount, 0),
    list.reduce((sum, one) => sum + one.bookedMinutes, 0),
    list.reduce((sum, one) => sum + one.availableMinutes, 0),
  );
}

/** Half an hour around what there is; 8:00–18:00 when there is nothing. */
export function scheduleRange(slots: MinuteRange[]): MinuteRange {
  if (!slots.length) return { start: 8 * 60, end: 18 * 60 };
  const start = Math.max(0, Math.min(...slots.map((one) => one.start)) - 30);
  const end = Math.min(DAY, Math.max(...slots.map((one) => one.end)) + 30);
  return { start, end: Math.max(end, start + 60) };
}

/**
 * Everyone's availability between two local dates as windows, their time
 * off cut out and kept apart (only where they would have worked).
 */
export function calendarWindows({
  specialistIds,
  rules,
  timeOff,
  from,
  to,
  timeZone,
}: {
  specialistIds: string[];
  rules: (AvailabilityRule & { specialistId: string })[];
  timeOff: {
    specialistId: string;
    startsAt: string;
    endsAt: string;
    reason: string | null;
  }[];
  from: string;
  to: string;
  timeZone: string;
}): { windows: CalendarWindow[]; timeOff: CalendarTimeOff[] } {
  const windows: CalendarWindow[] = [];
  const off: CalendarTimeOff[] = [];
  for (const specialistId of specialistIds) {
    const own = rules.filter((rule) => rule.specialistId === specialistId);
    if (!own.length) continue;
    const absences = timeOff
      .filter((one) => one.specialistId === specialistId)
      .map((one) => ({
        start: new Date(one.startsAt),
        end: new Date(one.endsAt),
        reason: one.reason,
      }));
    const expand = (cut: typeof absences) =>
      expandAvailability({ rules: own, timeOff: cut, from, to, timeZone });
    for (const window of expand(absences)) {
      windows.push({
        id: `${window.ruleId}:${window.start.toISOString()}`,
        specialistId,
        placeId:
          window.mode === "online" ? "online" : (window.roomId ?? "online"),
        start: window.start,
        end: window.end,
      });
    }
    for (const raw of absences.length ? expand([]) : []) {
      for (const absence of absences) {
        const start = Math.max(raw.start.getTime(), absence.start.getTime());
        const end = Math.min(raw.end.getTime(), absence.end.getTime());
        if (end > start) {
          off.push({
            specialistId,
            start: new Date(start),
            end: new Date(end),
            reason: absence.reason,
          });
        }
      }
    }
  }
  const byStart = (a: { start: Date }, b: { start: Date }) =>
    a.start.getTime() - b.start.getTime();
  return { windows: windows.sort(byStart), timeOff: off.sort(byStart) };
}

/** An instant in minutes of a local date, cut at its midnights. */
function minutesOn(instant: Date, date: string, timeZone: string) {
  const day = formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
  if (day < date) return 0;
  if (day > date) return DAY;
  return timeToMinutes(formatInTimeZone(instant, timeZone, "HH:mm"));
}

function span(start: Date, end: Date, date: string, timeZone: string) {
  const range = {
    start: minutesOn(start, date, timeZone),
    end: minutesOn(end, date, timeZone),
  };
  return range.end > range.start ? range : null;
}

const compact = (range: MinuteRange) =>
  `${minutesToTime(range.start)}–${minutesToTime(range.end)}`;
const spaced = (range: MinuteRange) =>
  `${minutesToTime(range.start)} – ${minutesToTime(range.end)}`;

const booked = (visit: VisitLike) =>
  visit.status === "confirmed" || visit.status === "awaiting_payment";

export interface CalendarInput {
  timeZone: string;
  now: Date;
  people: CalendarPerson[];
  rooms: CalendarRoom[];
  windows: CalendarWindow[];
  timeOff: CalendarTimeOff[];
  visits: VisitLike[];
  /** Words to find in the client, service, reference or specialist. */
  query?: string | null;
}

interface Context {
  timeZone: string;
  now: Date;
  today: string;
  people: Map<string, CalendarPerson>;
  places: Map<string, CalendarPlace>;
  rooms: CalendarRoom[];
  windows: CalendarWindow[];
  timeOff: CalendarTimeOff[];
  visits: VisitLike[];
  query: string | null;
}

function contextOf(input: CalendarInput): Context {
  const places = new Map<string, CalendarPlace>([[ONLINE.id, ONLINE]]);
  for (const room of input.rooms) {
    places.set(room.id, {
      id: room.id,
      name: room.name,
      short: placeShort(room.name),
      color: room.color,
      online: false,
    });
  }
  return {
    timeZone: input.timeZone,
    now: input.now,
    today: formatInTimeZone(input.now, input.timeZone, "yyyy-MM-dd"),
    people: new Map(input.people.map((one) => [one.id, one])),
    places,
    rooms: input.rooms,
    windows: input.windows,
    timeOff: input.timeOff,
    visits: input.visits.filter(booked),
    query: input.query?.trim().toLowerCase() || null,
  };
}

function visitPlace(ctx: Context, visit: VisitLike): CalendarPlace {
  if (visit.mode === "online") return ONLINE;
  if (!visit.room) return IN_PERSON;
  return (
    ctx.places.get(visit.room.id) ?? {
      id: visit.room.id,
      name: visit.room.name,
      short: placeShort(visit.room.name),
      color: visit.room.color,
      online: false,
    }
  );
}

function availabilitySlots(
  items: { key: string; range: MinuteRange; place: CalendarPlace }[],
): AvailabilitySlot[] {
  const sorted = [...items].sort((a, b) => a.range.start - b.range.start);
  return sorted.map((item, index) => {
    const time = compact(item.range);
    return {
      key: item.key,
      ...item.range,
      time,
      place: item.place,
      adjacentToPrevious:
        index > 0 && sorted[index - 1]!.range.end === item.range.start,
      label: `Dostępność ${time}, ${item.place.name}`,
    };
  });
}

function visitSlots(
  ctx: Context,
  visits: VisitLike[],
  date: string,
  byRoom: boolean,
): VisitSlot[] {
  return visits
    .flatMap((visit): VisitSlot[] => {
      const range = span(
        new Date(visit.startsAt),
        new Date(visit.endsAt),
        date,
        ctx.timeZone,
      );
      if (!range) return [];
      const held = visit.heldUntil
        ? span(
            new Date(visit.startsAt),
            new Date(visit.heldUntil),
            date,
            ctx.timeZone,
          )
        : null;
      const place = visitPlace(ctx, visit);
      const name =
        ctx.people.get(visit.specialist.id)?.name ?? visit.specialist.name;
      const client = visit.client.name ?? "Klient";
      const time = spaced(range);
      const haystack = [client, visit.serviceName, visit.reference, name]
        .join(" ")
        .toLowerCase();
      return [
        {
          key: visit.id,
          visitId: visit.id,
          ...range,
          minutes: range.end - range.start,
          heldEnd: Math.max(range.end, held?.end ?? range.end),
          time,
          startTime: minutesToTime(range.start),
          client,
          clientInitials: initialsOf(client),
          service: visit.serviceName,
          place,
          person: {
            id: visit.specialist.id,
            name,
            initials: initialsOf(name),
            avatarUrl: ctx.people.get(visit.specialist.id)?.avatarUrl ?? null,
          },
          pending: visit.status === "awaiting_payment",
          dimmed: ctx.query !== null && !haystack.includes(ctx.query),
          label: [
            client,
            visit.serviceName,
            time,
            byRoom ? name : place.name,
            visit.status === "awaiting_payment" ? "czeka na płatność" : null,
          ]
            .filter(Boolean)
            .join(", "),
        },
      ];
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

type ColumnParts = Omit<
  CalendarColumn,
  "isToday" | "hours" | "unavailable" | "occupancy"
>;

function finish(ctx: Context, parts: ColumnParts): CalendarColumn {
  const { availability, visits } = parts;
  return {
    ...parts,
    isToday: parts.date === ctx.today,
    hours: availability.length
      ? spaced({
          start: Math.min(...availability.map((one) => one.start)),
          end: Math.max(...availability.map((one) => one.end)),
        })
      : null,
    unavailable:
      parts.closed !== null || (!availability.length && !visits.length),
    // All the time visits hold: the time after them too.
    occupancy: occupancyOf(
      visits.map((visit) => ({ start: visit.start, end: visit.heldEnd })),
      availability,
    ),
  };
}

function spansOn(
  ctx: Context,
  items: { start: Date; end: Date }[],
  date: string,
) {
  return items.flatMap((one) => {
    const range = span(one.start, one.end, date, ctx.timeZone);
    return range ? [range] : [];
  });
}

function specialistColumn(
  ctx: Context,
  person: CalendarPerson,
  date: string,
  kind: "specialist" | "day" = "specialist",
): CalendarColumn {
  return finish(ctx, {
    key: kind === "day" ? date : person.id,
    kind,
    date,
    title: person.name,
    subtitle: person.title,
    avatarUrl: person.avatarUrl,
    initials: initialsOf(person.name),
    short: person.name.split(/\s+/)[0] ?? person.name,
    color: person.color,
    colorSeed: person.id,
    closed: null,
    availability: availabilitySlots(
      ctx.windows
        .filter((one) => one.specialistId === person.id)
        .flatMap((one) => {
          const range = span(one.start, one.end, date, ctx.timeZone);
          return range
            ? [
                {
                  key: one.id,
                  range,
                  place: ctx.places.get(one.placeId) ?? IN_PERSON,
                },
              ]
            : [];
        }),
    ),
    blocked: ctx.timeOff
      .filter((one) => one.specialistId === person.id)
      .flatMap((one) => {
        const range = span(one.start, one.end, date, ctx.timeZone);
        return range
          ? [
              {
                key: `off:${person.id}:${one.start.toISOString()}`,
                ...range,
                time: spaced(range),
                label: one.reason?.trim() || "Nieobecność",
              },
            ]
          : [];
      }),
    visits: visitSlots(
      ctx,
      ctx.visits.filter((one) => one.specialist.id === person.id),
      date,
      false,
    ),
  });
}

function roomColumn(
  ctx: Context,
  room: CalendarRoom,
  date: string,
): CalendarColumn {
  const place = ctx.places.get(room.id)!;
  const today = room.exceptions.filter((one) => one.date === date);
  const closedAllDay = today.find((one) => one.type === "closed_all_day");
  // Without opening hours a room is open whenever someone works in it.
  const open = closedAllDay
    ? []
    : room.hours.length
      ? openIntervalsOn(date, room.hours, today)
      : mergeIntervals(
          spansOn(
            ctx,
            ctx.windows.filter((one) => one.placeId === room.id),
            date,
          ),
        );
  return finish(ctx, {
    key: room.id,
    kind: "room",
    date,
    title: room.name,
    subtitle: null,
    avatarUrl: null,
    initials: place.short,
    short: place.short,
    color: room.color,
    colorSeed: room.id,
    closed: closedAllDay
      ? closedAllDay.reason?.trim() || "Gabinet zamknięty"
      : null,
    availability: availabilitySlots(
      open.map((range) => ({
        key: `${room.id}:${date}:${range.start}`,
        range,
        place,
      })),
    ),
    blocked: today
      .filter(
        (one) => one.type === "blocked_interval" && one.startsAt && one.endsAt,
      )
      .map((one) => {
        const range = {
          start: timeToMinutes(one.startsAt!),
          end: timeToMinutes(one.endsAt!) || DAY,
        };
        return {
          key: `${room.id}:${date}:blocked:${range.start}`,
          ...range,
          time: spaced(range),
          label: one.reason?.trim() || "Zablokowany",
        };
      }),
    visits: visitSlots(
      ctx,
      ctx.visits.filter(
        (one) => one.mode === "in_person" && one.room?.id === room.id,
      ),
      date,
      true,
    ),
  });
}

function onlineColumn(ctx: Context, date: string): CalendarColumn {
  return finish(ctx, {
    key: ONLINE.id,
    kind: "online",
    date,
    title: ONLINE.name,
    subtitle: null,
    avatarUrl: null,
    initials: ONLINE.short,
    short: ONLINE.short,
    color: null,
    colorSeed: ONLINE.id,
    closed: null,
    availability: availabilitySlots(
      mergeIntervals(
        spansOn(
          ctx,
          ctx.windows.filter((one) => one.placeId === ONLINE.id),
          date,
        ),
      ).map((range) => ({
        key: `online:${date}:${range.start}`,
        range,
        place: ONLINE,
      })),
    ),
    blocked: [],
    visits: visitSlots(
      ctx,
      ctx.visits.filter((one) => one.mode === "online"),
      date,
      true,
    ),
  });
}

const hasContent = (column: CalendarColumn) =>
  column.availability.length > 0 ||
  column.visits.length > 0 ||
  column.blocked.length > 0 ||
  column.closed !== null;

function columnsOn(
  ctx: Context,
  date: string,
  perspective: CalendarPerspective,
  hideEmpty: boolean,
) {
  const columns =
    perspective === "specialists"
      ? [...ctx.people.values()].map((one) => specialistColumn(ctx, one, date))
      : [
          ...ctx.rooms.map((one) => roomColumn(ctx, one, date)),
          onlineColumn(ctx, date),
        ];
  return columns.filter(
    (column) =>
      // Online gets a column only when something happens online.
      (column.kind !== "online" || hasContent(column)) &&
      (!hideEmpty || hasContent(column)),
  );
}

const everything = (columns: CalendarColumn[]) =>
  columns.flatMap((one) => [
    ...one.availability,
    ...one.blocked,
    ...one.visits,
  ]);

function nowOf(ctx: Context, shown: boolean): CalendarNow | null {
  if (!shown) return null;
  const label = formatInTimeZone(ctx.now, ctx.timeZone, "HH:mm");
  return { minute: timeToMinutes(label), label };
}

/** A day: a column per specialist, or per room (and online, when used). */
export function dayView(
  input: CalendarInput & {
    date: string;
    perspective: CalendarPerspective;
    hideEmpty?: boolean;
  },
): CalendarDayView {
  const ctx = contextOf(input);
  const columns = columnsOn(
    ctx,
    input.date,
    input.perspective,
    input.hideEmpty ?? false,
  );
  return {
    date: input.date,
    range: scheduleRange(everything(columns)),
    now: nowOf(ctx, input.date === ctx.today),
    columns,
  };
}

/** Monday to Friday, and the weekend days that are today or used. */
function keepDay(index: number, date: string, today: string, used: boolean) {
  return index < 5 || date === today || used;
}

function summaryOf(
  columns: CalendarColumn[],
  resources: SummaryResource[],
): ComparisonSummary {
  const items: SummaryItem[] = resources.map((one) => {
    const own = columns.filter((column) => column.key === one.id);
    return {
      ...one,
      closed: own.length > 0 && own.every((column) => column.closed !== null),
      occupancy: sumOccupancy(own.map((column) => column.occupancy)),
    };
  });
  const active = items
    .filter(
      (item) =>
        item.occupancy.availableMinutes > 0 || item.occupancy.visitCount > 0,
    )
    .sort((a, b) => b.occupancy.percent - a.occupancy.percent);
  const pick = (item: SummaryItem | undefined) =>
    item
      ? {
          id: item.id,
          name: item.name,
          avatarUrl: item.avatarUrl,
          color: item.color,
          colorSeed: item.colorSeed,
          percent: item.occupancy.percent,
        }
      : null;
  const total = sumOccupancy(items.map((item) => item.occupancy));
  return {
    visitCount: total.visitCount,
    occupancy: total,
    highest: pick(active[0]),
    lowest: pick(active.at(-1)),
    items,
  };
}

/**
 * A week comparing everyone: per day, a narrow lane per specialist or
 * room, the day's occupancy, and the week summed up per resource.
 */
export function weekComparison(
  input: CalendarInput & {
    week: string;
    perspective: CalendarPerspective;
    hideEmpty?: boolean;
  },
): CalendarWeekView {
  const ctx = contextOf(input);
  const days = WEEKDAY_SHORT.flatMap((label, index) => {
    const date = addDays(input.week, index);
    const columns = columnsOn(ctx, date, input.perspective, false);
    if (!keepDay(index, date, ctx.today, columns.some(hasContent))) return [];
    return [
      {
        date,
        label: `${label}, ${Number(date.slice(8))}`,
        isToday: date === ctx.today,
        occupancy: sumOccupancy(columns.map((one) => one.occupancy)),
        all: columns,
        lanes: input.hideEmpty ? columns.filter(hasContent) : columns,
      },
    ];
  });
  const shown = days.flatMap((day) => day.all);
  const resources: SummaryResource[] =
    input.perspective === "specialists"
      ? input.people.map((one) => ({
          id: one.id,
          name: one.name,
          avatarUrl: one.avatarUrl,
          color: one.color,
          colorSeed: one.id,
        }))
      : [
          ...input.rooms.map((one) => ({
            id: one.id,
            name: one.name,
            avatarUrl: null,
            color: one.color,
            colorSeed: one.id,
          })),
          ...(shown.some((one) => one.kind === "online")
            ? [
                {
                  id: ONLINE.id,
                  name: ONLINE.name,
                  avatarUrl: null,
                  color: null,
                  colorSeed: ONLINE.id,
                },
              ]
            : []),
        ];
  return {
    from: input.week,
    to: addDays(input.week, 6),
    range: scheduleRange(everything(days.flatMap((day) => day.lanes))),
    now: nowOf(
      ctx,
      days.some((day) => day.isToday),
    ),
    days: days.map(({ all: _all, ...day }) => day),
    summary: summaryOf(shown, resources),
  };
}

const dayMonthShort = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** A specialist's own week, a column per day, summed up. */
export function personalWeek(
  input: CalendarInput & {
    week: string;
    person: CalendarPerson;
    /** Only the days with something on them. */
    hideEmpty?: boolean;
    /** How many next visits to keep (default 3). */
    upcomingLimit?: number;
  },
): PersonalWeekView {
  const ctx = contextOf(input);
  const all = WEEKDAY_SHORT.map((label, index) => {
    const date = addDays(input.week, index);
    return {
      ...specialistColumn(ctx, input.person, date, "day"),
      title: label,
      subtitle: formatDayMonth(date),
    };
  });
  const columns = all.filter((column, index) =>
    input.hideEmpty
      ? hasContent(column)
      : keepDay(index, column.date, ctx.today, hasContent(column)),
  );
  const nowMs = ctx.now.getTime();
  const upcoming = ctx.visits
    .filter(
      (visit) =>
        visit.specialist.id === input.person.id &&
        new Date(visit.endsAt).getTime() > nowMs,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, input.upcomingLimit ?? 3)
    .flatMap((visit) => {
      const date = formatInTimeZone(
        new Date(visit.startsAt),
        ctx.timeZone,
        "yyyy-MM-dd",
      );
      const day = `${WEEKDAY_SHORT[isoWeekday(date) - 1]}, ${dayMonthShort.format(new Date(`${date}T12:00:00Z`))}`;
      return visitSlots(ctx, [visit], date, false).map((slot) => ({
        ...slot,
        day,
        date,
      }));
    });
  const occupancy = sumOccupancy(all.map((one) => one.occupancy));
  return {
    from: input.week,
    to: addDays(input.week, 6),
    range: scheduleRange(everything(columns)),
    now: nowOf(
      ctx,
      columns.some((one) => one.isToday),
    ),
    columns,
    summary: { visitCount: occupancy.visitCount, occupancy, upcoming },
  };
}

/** An availability slot shown in the view, with the column it is in. */
export function findAvailability(
  columns: CalendarColumn[],
  key: string | null,
): { slot: AvailabilitySlot; column: CalendarColumn } | null {
  if (!key) return null;
  for (const column of columns) {
    const slot = column.availability.find((one) => one.key === key);
    if (slot) return { slot, column };
  }
  return null;
}

export interface NewVisitDefaults {
  specialistId: string | null;
  /** The centre's local date and time. */
  date: string;
  time: string;
  mode: "in_person" | "online" | null;
  roomId: string | null;
}

/**
 * What a new visit picked in the grid starts with: the specialist of the
 * column (or of one's own week), and where they work then (their window's
 * room, or online); in a room's column, that room.
 */
export function newVisitDefaults(
  columns: CalendarColumn[],
  key: string | null,
  slot: string,
): NewVisitDefaults {
  const [date = "", time = ""] = slot.split("T");
  const minute = timeToMinutes(time);
  const column =
    columns.find(
      (one) =>
        one.date === date && (key ? one.key === key : one.kind === "day"),
    ) ?? null;
  const none = { specialistId: null, date, time, mode: null, roomId: null };
  if (!column) return none;
  if (column.kind === "room") {
    return { ...none, mode: "in_person", roomId: column.key };
  }
  if (column.kind === "online") return { ...none, mode: "online" };

  const window = column.availability.find(
    (one) => one.start <= minute && minute < one.end,
  );
  const specialistId = column.kind === "day" ? column.colorSeed : column.key;
  if (!window || window.place.id === IN_PERSON.id) {
    return { ...none, specialistId };
  }
  return window.place.online
    ? { ...none, specialistId, mode: "online" }
    : { ...none, specialistId, mode: "in_person", roomId: window.place.id };
}

/**
 * Where a visit the centre moves (R12) goes by default: the place picked in
 * the grid (a room's column, online, or the specialist's window then), else
 * where it was.
 */
export function moveVisitDefaults(
  columns: CalendarColumn[],
  key: string | null,
  slot: string,
  visit: { mode: "in_person" | "online"; roomId: string | null },
): Omit<NewVisitDefaults, "specialistId" | "mode"> & {
  mode: "in_person" | "online";
} {
  const { date, time, mode, roomId } = newVisitDefaults(columns, key, slot);
  return mode
    ? { date, time, mode, roomId }
    : { date, time, mode: visit.mode, roomId: visit.roomId };
}
