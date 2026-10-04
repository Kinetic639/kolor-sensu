import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "./availability";
import { WEEKDAY_ABBR } from "./room-hours";
import type { ServiceDay } from "./service-week";
import { bookingHref, type VisitLike, type VisitTone } from "./visits";

// The admin's day on a line of hours (docs/product/booking-plan.md, R14):
// today's visits as cards placed by their time, a lane per room (online
// last) or per person of the team, where "now" is, and each lane's load.
// Pure, so every case is tested; the dashboard draws it (@repo/ui).

const DAY_START = 8;
const DAY_END = 18;

export interface TimelinePerson {
  id: string;
  name: string;
  color: string | null;
}

export interface TimelineRoom {
  id: string;
  name: string;
  color: string | null;
}

export interface TimelineCard {
  id: string;
  reference: string;
  clientName: string;
  serviceName: string;
  /** Its own price, `200 zł` (each specialist may ask their own). */
  price: string;
  /** `11:00–11:50`, where the centre is. */
  time: string;
  /** Where it starts and how long it is, in % of the day's line. */
  left: number;
  width: number;
  specialist: TimelinePerson & { initials: string };
  /** The room, or online (`id` null). */
  place: {
    id: string | null;
    name: string;
    color: string | null;
    online: boolean;
  };
  status: { label: string; tone: VisitTone };
  past: boolean;
  current: boolean;
  awaitingPayment: boolean;
  /** The booking open in the bookings table. */
  href: string;
}

export interface TimelineLane {
  id: string;
  kind: "room" | "online" | "person";
  name: string;
  color: string | null;
  /** `3 · 38%` for a room, `4 · 08:00–16:20` for a person. */
  summary: string;
  cards: TimelineCard[];
}

export interface DayTimeline {
  startHour: number;
  endHour: number;
  /** The hour marks, `[8, 9, …, 17]`. */
  hours: number[];
  /** Where now is, in % of the line; null outside it. */
  now: number | null;
  rooms: TimelineLane[];
  people: TimelineLane[];
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const live = (visit: VisitLike) =>
  visit.status === "confirmed" || visit.status === "awaiting_payment";

export function dayTimeline(
  visits: VisitLike[],
  {
    timeZone,
    now,
    date = formatInTimeZone(now, timeZone, "yyyy-MM-dd"),
    rooms,
    specialists,
  }: {
    timeZone: string;
    now: Date;
    /** The day shown, `2026-10-09` (today when left out). */
    date?: string;
    /** The centre's rooms in use (shown even when free). */
    rooms: TimelineRoom[];
    /** The team: those with visits today get a lane. */
    specialists: TimelinePerson[];
  },
): DayTimeline {
  const hhmm = (instant: string | Date) =>
    formatInTimeZone(new Date(instant), timeZone, "HH:mm");
  const minutesOf = (instant: string | Date) => {
    const [h, m] = hhmm(instant).split(":").map(Number);
    return h! * 60 + m!;
  };
  const taking = visits
    .filter(live)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  // The usual working day, widened to every visit.
  let startHour = DAY_START;
  let endHour = DAY_END;
  for (const visit of taking) {
    startHour = Math.min(startHour, Math.floor(minutesOf(visit.startsAt) / 60));
    endHour = Math.max(endHour, Math.ceil(minutesOf(visit.endsAt) / 60));
  }
  const dayMinutes = (endHour - startHour) * 60;
  const at = (minutes: number) =>
    ((minutes - startHour * 60) / dayMinutes) * 100;

  // Now is on the line only on today's, within its hours.
  const nowMinutes = minutesOf(now);
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd") === date;
  const nowAt =
    today && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60
      ? at(nowMinutes)
      : null;

  const cardOf = (visit: VisitLike): TimelineCard => {
    const start = minutesOf(visit.startsAt);
    const end = minutesOf(visit.endsAt);
    const past = new Date(visit.endsAt) <= now;
    const current = !past && new Date(visit.startsAt) <= now;
    const awaitingPayment = visit.status === "awaiting_payment";
    const status: TimelineCard["status"] = awaitingPayment
      ? {
          label: visit.paymentDueAt
            ? `Czeka na płatność · do ${hhmm(visit.paymentDueAt)}`
            : "Czeka na płatność",
          tone: "warning",
        }
      : current
        ? { label: "Trwa", tone: "info" }
        : past
          ? { label: "Minęła", tone: "neutral" }
          : visit.payment?.paid
            ? { label: "Opłacona", tone: "success" }
            : { label: "Potwierdzona", tone: "success" };
    const online = visit.mode === "online";
    return {
      id: visit.id,
      reference: visit.reference,
      clientName: visit.client.name ?? "Klient bez nazwiska",
      serviceName: visit.serviceName,
      time: `${hhmm(visit.startsAt)}–${hhmm(visit.endsAt)}`,
      price: money(visit.priceMinor, visit.currencyCode),
      left: at(start),
      width: ((end - start) / dayMinutes) * 100,
      specialist: {
        ...visit.specialist,
        initials: initialsOf(visit.specialist.name),
      },
      place: online
        ? { id: null, name: "Online", color: null, online: true }
        : {
            id: visit.room?.id ?? null,
            name: visit.room?.name ?? "Stacjonarnie",
            color: visit.room?.color ?? null,
            online: false,
          },
      status,
      past,
      current,
      awaitingPayment,
      // Just this booking, as everywhere a booking is clicked.
      href: bookingHref(visit),
    };
  };
  const cards = taking.map(cardOf);

  const load = (lane: TimelineCard[]) => {
    if (!lane.length) return "wolny";
    const busy = lane.reduce((sum, card) => sum + card.width, 0);
    return `${lane.length} · ${Math.round(busy)}%`;
  };
  const roomLanes: TimelineLane[] = rooms.map((room) => {
    const own = cards.filter((card) => card.place.id === room.id);
    return {
      id: room.id,
      kind: "room",
      name: room.name,
      color: room.color,
      summary: load(own),
      cards: own,
    };
  });
  const online = cards.filter((card) => card.place.online);
  if (online.length) {
    roomLanes.push({
      id: "online",
      kind: "online",
      name: "Online",
      color: null,
      summary: String(online.length),
      cards: online,
    });
  }

  const people: TimelineLane[] = specialists
    .map((person) => {
      const own = cards.filter((card) => card.specialist.id === person.id);
      const first = own[0];
      const last = own.at(-1);
      return {
        id: person.id,
        kind: "person" as const,
        name: person.name,
        color: person.color,
        summary:
          first && last
            ? `${own.length} · ${first.time.slice(0, 5)}–${last.time.slice(-5)}`
            : "",
        cards: own,
      };
    })
    .filter((lane) => lane.cards.length);

  return {
    startHour,
    endHour,
    hours: Array.from(
      { length: endHour - startHour },
      (_, index) => startHour + index,
    ),
    now: nowAt,
    rooms: roomLanes,
    people,
  };
}

export interface WeekFigure {
  id: "visits" | "paid" | "cancelled";
  label: string;
  value: string;
  /** Against the week before: `+2`, `-10%`, or null (nothing to compare). */
  change: string | null;
  /** Whether the change is good news. */
  trend: "up" | "down" | "flat";
}

function money(minor: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

/**
 * The week's visits day by day (booked ones, as its figures count them),
 * in the centre's time; today marked.
 */
export function weekVisitsByDay(
  visits: VisitLike[],
  {
    timeZone,
    now,
    week,
  }: {
    timeZone: string;
    now: Date;
    /** The week's Monday. */
    week: string;
  },
): ServiceDay[] {
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const days = WEEKDAY_ABBR.map((weekday, index) => {
    const date = addDays(week, index);
    return { date, weekday, isToday: date === today, count: 0 };
  });
  for (const visit of visits.filter(live)) {
    const date = formatInTimeZone(
      new Date(visit.startsAt),
      timeZone,
      "yyyy-MM-dd",
    );
    const day = days.find((one) => one.date === date);
    if (day) day.count += 1;
  }
  return days;
}

/** This week in three figures, against the week before. */
export function weekSummary(
  thisWeek: VisitLike[],
  lastWeek: VisitLike[],
): WeekFigure[] {
  const figures = (visits: VisitLike[]) => ({
    visits: visits.filter(live).length,
    paid: visits
      .filter((visit) => live(visit) && visit.payment?.paid)
      .reduce((sum, visit) => sum + visit.priceMinor, 0),
    cancelled: visits.filter((visit) => visit.status === "cancelled").length,
  });
  const now = figures(thisWeek);
  const before = figures(lastWeek);
  // No change: nothing to say.
  const count = (a: number, b: number) =>
    a === b ? null : `${a > b ? "+" : ""}${a - b}`;
  const percent = (a: number, b: number) =>
    b === 0 || a === b
      ? null
      : `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%`;
  const trend = (a: number, b: number, more: "up" | "down") =>
    a === b ? "flat" : a > b ? more : more === "up" ? "down" : "up";
  return [
    {
      id: "visits",
      label: "Wizyty",
      value: String(now.visits),
      change: count(now.visits, before.visits),
      trend: trend(now.visits, before.visits, "up"),
    },
    {
      id: "paid",
      label: "Opłacone",
      value: money(now.paid),
      change: percent(now.paid, before.paid),
      trend: trend(now.paid, before.paid, "up"),
    },
    {
      id: "cancelled",
      label: "Odwołania",
      value: String(now.cancelled),
      change: count(now.cancelled, before.cancelled),
      trend: trend(now.cancelled, before.cancelled, "down"),
    },
  ];
}

const MONTHS = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

/** `2026-10-09` and a number of days on. */
function shift(date: string, days: number) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export interface DayNav {
  date: string;
  /** `9 października` */
  label: string;
  previous: string;
  next: string;
  isToday: boolean;
}

/** The day shown on the line and the days around it. */
export function dayNav(date: string, today: string): DayNav {
  const day = new Date(`${date}T12:00:00Z`);
  return {
    date,
    label: `${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`,
    previous: shift(date, -1),
    next: shift(date, 1),
    isToday: date === today,
  };
}
