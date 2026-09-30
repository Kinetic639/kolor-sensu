import { formatInTimeZone } from "date-fns-tz";
import {
  addDays,
  expandAvailability,
  type AvailabilityMode,
  type AvailabilityRule,
} from "./availability";
import {
  formatHours,
  minutesToTime,
  timeToMinutes,
  visibleRange,
  type MinuteRange,
} from "./grid";
import { formatDayMonth, WEEKDAY_SHORT } from "./labels";
import type { VisitLike } from "./visits";

// The calendar views (docs/product/scheduling-ui-plan.md, K5): a day with a
// column per specialist or room, and a week of one of them. Availability
// is the calm background, booked visits the cards over it. Everything is
// in minutes since the centre's local midnight; the UI places them.

export interface CalendarResource {
  id: string;
  name: string;
  color: string | null;
}

/** One availability window of a specialist, as real instants. */
export interface CalendarWindow {
  id: string;
  specialist: CalendarResource;
  /** Null online. */
  room: CalendarResource | null;
  start: Date;
  end: Date;
  mode: AvailabilityMode;
}

/**
 * Everyone's availability between two local dates as windows, each with
 * its specialist and room, their time off cut out. Rules of specialists
 * not given are left out.
 */
export function calendarWindows({
  specialists,
  rooms,
  rules,
  timeOff,
  from,
  to,
  timeZone,
}: {
  specialists: CalendarResource[];
  rooms: CalendarResource[];
  rules: (AvailabilityRule & { specialistId: string })[];
  timeOff: { specialistId: string; startsAt: string; endsAt: string }[];
  from: string;
  to: string;
  timeZone: string;
}): CalendarWindow[] {
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  return specialists
    .flatMap((specialist) =>
      expandAvailability({
        rules: rules.filter((rule) => rule.specialistId === specialist.id),
        timeOff: timeOff
          .filter((one) => one.specialistId === specialist.id)
          .map((one) => ({
            start: new Date(one.startsAt),
            end: new Date(one.endsAt),
          })),
        from,
        to,
        timeZone,
      }).map((window) => ({
        id: `${window.ruleId}:${window.start.toISOString()}`,
        specialist,
        room: window.roomId ? (roomById.get(window.roomId) ?? null) : null,
        start: window.start,
        end: window.end,
        mode: window.mode,
      })),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export type CalendarPerspective = "specialists" | "rooms";

export interface CalendarBlockModel extends MinuteRange {
  kind: "availability" | "visit";
  key: string;
  /** The client for a visit; the room (or specialist, by room) for hours. */
  title: string;
  /** The service of a visit. */
  subtitle: string | null;
  /** The other side of a visit: its room, or its specialist by room. */
  meta: string | null;
  /** `10:00–10:50` */
  time: string;
  /** Accessible name: who, what, when, where. */
  label: string;
  /** Whose colour it wears, and the seed of the automatic one. */
  color: string | null;
  colorSeed: string;
  visitId: string | null;
  /** Booked but not paid yet. */
  pending: boolean;
  /** Side by side with overlapping visits: which of how many. */
  lane: number;
  lanes: number;
}

export interface CalendarColumnModel {
  key: string;
  label: string;
  sublabel: string | null;
  color: string | null;
  colorSeed: string;
  isToday: boolean;
  blocks: CalendarBlockModel[];
  /** `09:00–17:00`: from the first hour available to the last; null: none. */
  hours: string | null;
  visitCount: number;
  /** `3 wizyty · 2,5 godz. z 8 godz.` */
  summary: string;
  /** Booked time as a percentage of the available time; null: none. */
  occupancy: number | null;
}

export interface CalendarViewModel {
  columns: CalendarColumnModel[];
  range: MinuteRange;
  /** Where the line for now goes, on today's columns; null: not shown. */
  nowMinute: number | null;
  /** Today is in the view. */
  today: boolean;
}

const ONLINE = { id: "online", name: "Online", color: null };
const IN_PERSON = { id: "stacjonarnie", name: "Stacjonarnie", color: null };
const DAY = 24 * 60;

/** `1 wizyta`, `2 wizyty`, `5 wizyt`. */
export function visitsLabel(count: number) {
  if (count === 1) return "1 wizyta";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return `${count} ${few ? "wizyty" : "wizyt"}`;
}

/**
 * Overlapping ranges side by side, as calendar apps do: each takes the
 * first free lane, and a group of overlapping ones shares its lane count.
 * Ranges come sorted by start.
 */
export function laneLayout(ranges: MinuteRange[]) {
  const layout = ranges.map(() => ({ lane: 0, lanes: 1 }));
  let group: number[] = [];
  let groupEnd = -1;
  let laneEnds: number[] = [];
  const close = () => {
    for (const index of group) layout[index]!.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };
  ranges.forEach((range, index) => {
    if (range.start >= groupEnd) close();
    let lane = laneEnds.findIndex((end) => end <= range.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = range.end;
    layout[index]!.lane = lane;
    group.push(index);
    groupEnd = Math.max(groupEnd, range.end);
  });
  close();
  return layout;
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

const timeOf = (range: MinuteRange) =>
  `${minutesToTime(range.start)}–${minutesToTime(range.end)}`;

const booked = (visit: VisitLike) =>
  visit.status === "confirmed" || visit.status === "awaiting_payment";

/** Who a window or visit is shown as, by the column's kind. */
type Side = "specialist" | "room";

function windowBlock(
  window: CalendarWindow,
  range: MinuteRange,
  date: string,
  shownAs: Side,
): CalendarBlockModel {
  const room =
    window.room ?? (window.mode === "in_person" ? IN_PERSON : ONLINE);
  const other = shownAs === "room" ? window.specialist : room;
  const time = timeOf(range);
  return {
    kind: "availability",
    key: `${window.id}:${date}`,
    ...range,
    title: other.name,
    subtitle: null,
    meta: null,
    time,
    label: `Dostępność ${time}, ${other.name}`,
    color: other.color,
    colorSeed: other.id,
    visitId: null,
    pending: false,
    lane: 0,
    lanes: 1,
  };
}

function visitBlock(
  visit: VisitLike,
  range: MinuteRange,
  shownAs: Side,
): Omit<CalendarBlockModel, "lane" | "lanes"> {
  const room =
    visit.mode === "online" ? ONLINE : (visit.room ?? IN_PERSON);
  const other = shownAs === "room" ? visit.specialist : room;
  const client = visit.client.name ?? "Klient";
  const time = timeOf(range);
  const place =
    visit.mode === "online"
      ? "Online"
      : [visit.room?.name, visit.locationName].filter(Boolean).join(" · ") ||
        "Stacjonarnie";
  return {
    kind: "visit",
    key: visit.id,
    ...range,
    title: client,
    subtitle: visit.serviceName,
    meta: other.name,
    time,
    label: [
      client,
      visit.serviceName,
      time,
      shownAs === "room" ? visit.specialist.name : place,
      visit.status === "awaiting_payment" ? "czeka na płatność" : null,
    ]
      .filter(Boolean)
      .join(", "),
    color: other.color,
    colorSeed: other.id,
    visitId: visit.id,
    pending: visit.status === "awaiting_payment",
  };
}

interface ColumnInput {
  key: string;
  label: string;
  sublabel: string | null;
  color: string | null;
  colorSeed: string;
  date: string;
  isToday: boolean;
  windows: CalendarWindow[];
  visits: VisitLike[];
  /** What the blocks show: the other side of the column. */
  shownAs: Side;
  timeZone: string;
}

function column(input: ColumnInput): CalendarColumnModel {
  const { date, timeZone, shownAs } = input;
  const availability = input.windows.flatMap((window) => {
    const range = span(window.start, window.end, date, timeZone);
    return range ? [windowBlock(window, range, date, shownAs)] : [];
  });
  const visits = input.visits
    .flatMap((visit) => {
      const range = span(
        new Date(visit.startsAt),
        new Date(visit.endsAt),
        date,
        timeZone,
      );
      return range ? [visitBlock(visit, range, shownAs)] : [];
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const lanes = laneLayout(visits);
  const blocks = [
    ...availability.sort((a, b) => a.start - b.start),
    ...visits.map((block, index) => ({ ...block, ...lanes[index]! })),
  ];

  const minutes = (list: MinuteRange[]) =>
    list.reduce((sum, block) => sum + block.end - block.start, 0);
  const available = minutes(availability);
  const bookedMinutes = minutes(visits);
  return {
    key: input.key,
    label: input.label,
    sublabel: input.sublabel,
    color: input.color,
    colorSeed: input.colorSeed,
    isToday: input.isToday,
    blocks,
    hours: availability.length
      ? timeOf({
          start: Math.min(...availability.map((block) => block.start)),
          end: Math.max(...availability.map((block) => block.end)),
        })
      : null,
    visitCount: visits.length,
    summary:
      available || bookedMinutes
        ? `${visitsLabel(visits.length)} · ${formatHours(bookedMinutes)} z ${formatHours(available)}`
        : visitsLabel(visits.length),
    occupancy: available ? Math.round((bookedMinutes / available) * 100) : null,
  };
}

function frame(
  columns: CalendarColumnModel[],
  now: Date,
  timeZone: string,
): CalendarViewModel {
  const today = columns.some((one) => one.isToday);
  return {
    columns,
    range: visibleRange(columns.flatMap((one) => one.blocks)),
    nowMinute: today
      ? timeToMinutes(formatInTimeZone(now, timeZone, "HH:mm"))
      : null,
    today,
  };
}

/** A day: a column per specialist or per room (and one online, if used). */
export function dayView({
  date,
  timeZone,
  perspective,
  resources,
  windows,
  visits,
  now,
}: {
  date: string;
  timeZone: string;
  perspective: CalendarPerspective;
  /** The specialists, or the rooms, in order. */
  resources: CalendarResource[];
  windows: CalendarWindow[];
  visits: VisitLike[];
  now: Date;
}): CalendarViewModel {
  const isToday = formatInTimeZone(now, timeZone, "yyyy-MM-dd") === date;
  const live = visits.filter(booked);
  const byRoom = perspective === "rooms";
  const roomOf = (item: { room: CalendarResource | null }) =>
    item.room?.id ?? ONLINE.id;
  // By room, online work gets a column of its own (dropped when empty).
  const shown = byRoom ? [...resources, ONLINE] : resources;

  const columns = shown.map((resource) =>
    column({
      key: resource.id,
      label: resource.name,
      sublabel: null,
      color: resource.color,
      colorSeed: resource.id,
      date,
      isToday,
      timeZone,
      shownAs: byRoom ? "room" : "specialist",
      windows: windows.filter((window) =>
        byRoom
          ? roomOf(window) === resource.id
          : window.specialist.id === resource.id,
      ),
      visits: live.filter((visit) =>
        byRoom
          ? roomOf(visit) === resource.id
          : visit.specialist.id === resource.id,
      ),
    }),
  );
  const used = columns.filter(
    (one) => one.key !== ONLINE.id || one.blocks.length > 0,
  );
  return frame(used, now, timeZone);
}

/**
 * A week (from its Monday) of one specialist or room: Monday to Friday,
 * and the weekend days that have something.
 */
export function weekView({
  week,
  timeZone,
  resource,
  windows,
  visits,
  now,
}: {
  week: string;
  timeZone: string;
  resource: { kind: "specialist" | "room"; id: string };
  windows: CalendarWindow[];
  visits: VisitLike[];
  now: Date;
}): CalendarViewModel {
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const byRoom = resource.kind === "room";
  const mine = {
    windows: windows.filter((window) =>
      byRoom
        ? window.room?.id === resource.id
        : window.specialist.id === resource.id,
    ),
    visits: visits.filter(
      (visit) =>
        booked(visit) &&
        (byRoom
          ? visit.mode === "in_person" && visit.room?.id === resource.id
          : visit.specialist.id === resource.id),
    ),
  };
  const columns = WEEKDAY_SHORT.map((label, index) => {
    const date = addDays(week, index);
    return column({
      key: date,
      label,
      sublabel: formatDayMonth(date),
      color: null,
      colorSeed: date,
      date,
      isToday: date === today,
      timeZone,
      shownAs: byRoom ? "room" : "specialist",
      ...mine,
    });
  }).filter(
    (one, index) => index < 5 || one.blocks.length > 0 || one.isToday,
  );
  return frame(columns, now, timeZone);
}
