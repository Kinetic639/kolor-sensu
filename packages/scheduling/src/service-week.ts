import { formatInTimeZone } from "date-fns-tz";
import { addDays, isoWeekday } from "./availability";
import type { CalendarPlace } from "./calendar-view";
import { WEEKDAY_ABBR } from "./room-hours";
import type { VisitLike } from "./visits";

// The services' weeks for the offer's list: each service's booked visits
// day by day in the week shown, and its next visits (from now on, whatever
// the week) as rows with who and where. Pure: the visits come read.

export interface ServiceDay {
  date: string;
  /** `Pn` */
  weekday: string;
  isToday: boolean;
  count: number;
}

export interface ServiceVisit {
  visitId: string;
  /** `2030-10-03` */
  date: string;
  /** `Czw 3.10` */
  dateLabel: string;
  /** `11:00 – 11:50` */
  time: string;
  /** `11:00` */
  startTime: string;
  client: string;
  specialist: { id: string; name: string; color: string | null };
  place: CalendarPlace;
  /** Booked, not paid yet. */
  pending: boolean;
}

export interface ServiceWeek {
  days: ServiceDay[];
  visitCount: number;
  upcoming: ServiceVisit[];
}

const booked = (visit: VisitLike) =>
  visit.status === "confirmed" || visit.status === "awaiting_payment";

const ONLINE: CalendarPlace = {
  id: "online",
  name: "Online",
  short: "ONL",
  color: null,
  online: true,
};

function placeOf(visit: VisitLike): CalendarPlace {
  if (visit.mode === "online") return ONLINE;
  if (!visit.room) {
    return {
      id: "stacjonarnie",
      name: "Stacjonarnie",
      short: "ST",
      color: null,
      online: false,
    };
  }
  return {
    id: visit.room.id,
    name: visit.room.name,
    short: visit.room.name,
    color: visit.room.color,
    online: false,
  };
}

/** Each service's week (only those with visits; the rest: none). */
export function serviceWeeks(input: {
  timeZone: string;
  now: Date;
  /** The week's Monday. */
  week: string;
  /** Any visits read: the week's, and those to come. */
  visits: VisitLike[];
  /** How many next visits to keep (default 5). */
  upcomingLimit?: number;
}): Map<string, ServiceWeek> {
  const local = (instant: string, pattern: string) =>
    formatInTimeZone(new Date(instant), input.timeZone, pattern);
  const today = formatInTimeZone(input.now, input.timeZone, "yyyy-MM-dd");
  const dates = WEEKDAY_ABBR.map((_, index) => addDays(input.week, index));
  const nowMs = input.now.getTime();
  const result = new Map<string, ServiceWeek>();
  const weekOf = (serviceId: string) => {
    let week = result.get(serviceId);
    if (!week) {
      week = {
        days: dates.map((date, index) => ({
          date,
          weekday: WEEKDAY_ABBR[index]!,
          isToday: date === today,
          count: 0,
        })),
        visitCount: 0,
        upcoming: [],
      };
      result.set(serviceId, week);
    }
    return week;
  };

  const visits = input.visits
    .filter((visit) => booked(visit) && visit.serviceId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const visit of visits) {
    const week = weekOf(visit.serviceId!);
    const date = local(visit.startsAt, "yyyy-MM-dd");
    const day = week.days.find((one) => one.date === date);
    if (day) {
      day.count += 1;
      week.visitCount += 1;
    }
    if (
      new Date(visit.endsAt).getTime() > nowMs &&
      week.upcoming.length < (input.upcomingLimit ?? 5)
    ) {
      const startTime = local(visit.startsAt, "HH:mm");
      week.upcoming.push({
        visitId: visit.id,
        date,
        dateLabel: `${WEEKDAY_ABBR[isoWeekday(date) - 1]} ${Number(date.slice(8))}.${Number(date.slice(5, 7))}`,
        time: `${startTime} – ${local(visit.endsAt, "HH:mm")}`,
        startTime,
        client: visit.client.name ?? "Klient",
        specialist: visit.specialist,
        place: placeOf(visit),
        pending: visit.status === "awaiting_payment",
      });
    }
  }
  return result;
}
