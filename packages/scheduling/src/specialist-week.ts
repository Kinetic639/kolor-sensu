import { addDays } from "./availability";
import {
  visitsLabel,
  type CalendarPlace,
  type PersonalWeekView,
} from "./calendar-view";
import { minutesToTime } from "./grid";
import { WEEKDAY_ABBR } from "./room-hours";

// A specialist's week for the team's list: their seven days (shifts,
// where, how booked), what they are doing right now, and the next visits
// as rows; read off their own week (personalWeek).

/** `5.10` */
const dayMonth = (date: string) =>
  `${Number(date.slice(8))}.${Number(date.slice(5, 7))}`;

export interface WeekDay {
  date: string;
  /** `Pn` */
  weekday: string;
  /** `5.10` */
  dateLabel: string;
  isToday: boolean;
  /** Their shifts, each with where: `08:00–12:00`, Gabinet Zielony. */
  shifts: { time: string; place: CalendarPlace }[];
  availableHours: number;
  bookedHours: number;
  /** Booked of available (not capped). */
  percent: number;
  overbooked: boolean;
}

/** The week's seven days, those the week does not show as empty ones. */
export function weekDays(
  week: Pick<PersonalWeekView, "from" | "columns">,
): WeekDay[] {
  const byDate = new Map(week.columns.map((column) => [column.date, column]));
  return WEEKDAY_ABBR.map((weekday, index) => {
    const date = addDays(week.from, index);
    const column = byDate.get(date);
    return {
      date,
      weekday,
      dateLabel: dayMonth(date),
      isToday: column?.isToday ?? false,
      shifts:
        column?.availability.map((slot) => ({
          time: slot.time,
          place: slot.place,
        })) ?? [],
      availableHours: column?.occupancy.availableHours ?? 0,
      bookedHours: column?.occupancy.bookedHours ?? 0,
      percent: column?.occupancy.percent ?? 0,
      overbooked: column?.occupancy.overbooked ?? false,
    };
  });
}

export interface NowStatus {
  /**
   * In a visit, on duty and free, later today, or not now; or (a service)
   * something keeps clients from it.
   */
  tone: "busy" | "free" | "later" | "off" | "warn";
  /** `Wizyta do 10:50 · Gabinet Zielony` */
  title: string;
  /** What comes next. */
  detail: string | null;
}

const where = (place: CalendarPlace) => (place.online ? "online" : place.name);

/**
 * What a specialist is doing now (the week shown is this one): in a
 * visit, on duty and free, starting later today, or done for the day;
 * null for another week.
 */
export function specialistNow(
  week: Pick<PersonalWeekView, "now" | "columns" | "summary">,
  { active }: { active: boolean },
): NowStatus | null {
  if (!active) return { tone: "off", title: "Nieaktywny", detail: null };
  const today = week.columns.find((column) => column.isToday);
  if (!week.now || !today) return null;
  const minute = week.now.minute;
  const visits = [...today.visits].sort((a, b) => a.start - b.start);
  const current = visits.find((one) => one.start <= minute && minute < one.end);
  const after = visits.filter((one) => one.start >= minute);

  if (current) {
    const next = after.find((one) => one !== current);
    return {
      tone: "busy",
      title: current.place.online
        ? `Wizyta online do ${minutesToTime(current.end)}`
        : `Wizyta do ${minutesToTime(current.end)} · ${current.place.name}`,
      detail: next
        ? `${current.client} · potem ${next.startTime}`
        : current.client,
    };
  }

  const slots = [...today.availability].sort((a, b) => a.start - b.start);
  const shift = slots.find((one) => one.start <= minute && minute < one.end);
  if (shift) {
    const next = after.find((one) => one.start < shift.end);
    return {
      tone: "free",
      title: shift.place.online
        ? "Dyżur online · wolny"
        : `Dyżur · ${shift.place.name} · wolny`,
      detail: next
        ? `Następna ${next.startTime} · ${next.client}`
        : `Bez wizyt do ${minutesToTime(shift.end)}`,
    };
  }

  const later = slots.find((one) => one.start > minute);
  if (later) {
    return {
      tone: "later",
      title: `Dziś od ${minutesToTime(later.start)} · ${where(later.place)}`,
      detail: after.length
        ? `${visitsLabel(after.length)} dziś`
        : "Bez wizyt dziś",
    };
  }

  const next = week.summary.upcoming[0];
  return {
    tone: "off",
    title: slots.length ? "Dziś już po dyżurze" : "Dziś wolne",
    detail: next
      ? `Następna ${next.day}, ${next.startTime} · ${next.client}`
      : "Brak zaplanowanych wizyt",
  };
}

export interface UpcomingVisit {
  visitId: string;
  /** `2030-10-03` */
  date: string;
  /** `Czw 3.10` */
  dateLabel: string;
  /** `13:00 – 13:50` */
  time: string;
  /** `13:00`, for sorting and the next visit. */
  startTime: string;
  client: string;
  service: string;
  place: CalendarPlace;
  /** Booked, not paid yet. */
  pending: boolean;
}

/** The next visits, as rows of a table. */
export function upcomingVisits(
  week: Pick<PersonalWeekView, "summary">,
): UpcomingVisit[] {
  return week.summary.upcoming.map((slot) => {
    const weekday = new Date(`${slot.date}T12:00:00Z`).getUTCDay();
    return {
      visitId: slot.visitId,
      date: slot.date,
      dateLabel: `${WEEKDAY_ABBR[(weekday + 6) % 7]} ${dayMonth(slot.date)}`,
      time: slot.time,
      startTime: slot.startTime,
      client: slot.client,
      service: slot.service,
      place: slot.place,
      pending: slot.pending,
    };
  });
}
