import { formatInTimeZone } from "date-fns-tz";
import { addDays, isoWeekday } from "./availability";
import {
  weekComparison,
  initialsOf,
  scheduleRange,
  type CalendarColumn,
  type CalendarInput,
  type CalendarNow,
  type CalendarPerson,
  type CalendarPlace,
  type Occupancy,
} from "./calendar-view";
import { minutesToTime, timeToMinutes, type MinuteRange } from "./grid";
import { formatDayMonth, WEEKDAY_SHORT } from "./labels";
import { WEEKDAY_ABBR, weekdaysLabel } from "./room-hours";
import type { NowStatus } from "./specialist-week";

// A room's week for the rooms' roster: its seven days (open when, closed,
// how booked), today on a line of hours (who is on duty when, the visits),
// what is happening there now, and who uses it this week. Read off the
// calendar's room columns (weekComparison) and the specialists' windows.

type Person = Pick<CalendarPerson, "id" | "name" | "color">;

export interface RoomDay {
  date: string;
  /** `Pn` */
  weekday: string;
  /** `5.10` */
  dateLabel: string;
  isToday: boolean;
  /** `08:00 – 20:00`; null: not open. */
  hours: string | null;
  /** Why it is closed all day. */
  closed: string | null;
  availableHours: number;
  bookedHours: number;
  percent: number;
  overbooked: boolean;
}

export interface RoomBlock extends MinuteRange {
  key: string;
  person: Person;
  /** `08:00–12:00` */
  time: string;
}

export interface RoomVisitBlock extends RoomBlock {
  visitId: string;
  client: string;
}

export interface RoomToday {
  date: string;
  /** The hours shown: 8:00–20:00 at least, more when needed. */
  range: MinuteRange;
  /** Minutes since midnight now. */
  now: number | null;
  closed: string | null;
  duties: RoomBlock[];
  visits: RoomVisitBlock[];
}

export interface RoomUser {
  person: Person;
  /** `Pn, Czw` */
  days: string;
  hours: number;
}

export interface RoomWeekView {
  days: RoomDay[];
  occupancy: Occupancy;
  /** Today, when the week shown is this one. */
  today: RoomToday | null;
  now: NowStatus | null;
  /** Who is on duty there this week, the most hours first. */
  users: RoomUser[];
  /**
   * The week as the calendar draws it (the room's page): a column a day,
   * the duties as the available time, each in its person's colour.
   */
  schedule: {
    range: MinuteRange;
    now: CalendarNow | null;
    columns: CalendarColumn[];
  };
}

const DEFAULT_CLOSED = "Gabinet zamknięty";
const span = (range: MinuteRange) =>
  `${minutesToTime(range.start)}–${minutesToTime(range.end)}`;
const tenth = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

function roomDay(
  date: string,
  index: number,
  column?: CalendarColumn,
): RoomDay {
  return {
    date,
    weekday: WEEKDAY_ABBR[index]!,
    dateLabel: `${Number(date.slice(8))}.${Number(date.slice(5, 7))}`,
    isToday: column?.isToday ?? false,
    hours: column?.closed ? null : (column?.hours ?? null),
    closed: column?.closed ?? null,
    availableHours: column?.occupancy.availableHours ?? 0,
    bookedHours: column?.occupancy.bookedHours ?? 0,
    percent: column?.occupancy.percent ?? 0,
    overbooked: column?.occupancy.overbooked ?? false,
  };
}

/** What is happening in the room now (see RoomWeekView.now). */
function roomNow(today: RoomToday): NowStatus | null {
  if (today.now === null) return null;
  if (today.closed) {
    return {
      tone: "off",
      title: "Zamknięty dziś",
      detail: today.closed === DEFAULT_CLOSED ? null : today.closed,
    };
  }
  const minute = today.now;
  const current = today.visits.find(
    (one) => one.start <= minute && minute < one.end,
  );
  const after = today.visits.filter(
    (one) => one.start >= minute && one !== current,
  );
  if (current) {
    const next = after[0];
    return {
      tone: "busy",
      title: `Wizyta do ${minutesToTime(current.end)} · ${current.person.name}`,
      detail: next
        ? `Potem ${minutesToTime(next.start)} · ${next.person.name}`
        : null,
    };
  }
  const duty = today.duties.find(
    (one) => one.start <= minute && minute < one.end,
  );
  if (duty) {
    const next = after.find((one) => one.start < duty.end);
    return {
      tone: "free",
      title: `Dyżur: ${duty.person.name} · wolny`,
      detail: next
        ? `Następna ${minutesToTime(next.start)} · ${next.client}`
        : `Bez wizyt do ${minutesToTime(duty.end)}`,
    };
  }
  const later = today.duties.filter((one) => one.start > minute);
  if (later.length) {
    const [first, ...rest] = later;
    return {
      tone: "later",
      title: `Wolny do ${minutesToTime(first!.start)}`,
      detail:
        `${minutesToTime(first!.start)} ${first!.person.name}` +
        (rest.length ? ` · i ${rest.length} więcej` : ""),
    };
  }
  return {
    tone: "off",
    title: today.duties.length ? "Dziś już bez dyżurów" : "Dziś bez dyżurów",
    detail: null,
  };
}

/** A person as a schedule's "place": their name and colour. */
function personPlace(person: Person): CalendarPlace {
  return {
    id: person.id,
    name: person.name,
    short: initialsOf(person.name),
    color: person.color,
    online: false,
  };
}

/** Every room's week, from the week's Monday. */
export function roomWeeks(
  input: CalendarInput & { week: string },
): Map<string, RoomWeekView> {
  const view = weekComparison({ ...input, perspective: "rooms" });
  const people = new Map(input.people.map((one) => [one.id, one]));
  const personOf = (id: string, name = "Specjalista"): Person =>
    people.get(id) ?? { id, name, color: null };
  const dates = WEEKDAY_ABBR.map((_, index) => addDays(input.week, index));
  const localDate = (instant: Date) =>
    formatInTimeZone(instant, input.timeZone, "yyyy-MM-dd");
  const localMinutes = (instant: Date) =>
    timeToMinutes(formatInTimeZone(instant, input.timeZone, "HH:mm"));

  return new Map(
    input.rooms.map((room) => {
      const columns = new Map(
        view.days.flatMap((day) =>
          day.lanes
            .filter((lane) => lane.key === room.id)
            .map((lane) => [day.date, lane] as const),
        ),
      );
      const windows = input.windows.filter(
        (one) =>
          one.placeId === room.id && dates.includes(localDate(one.start)),
      );

      // A room with opening hours, but none that day, is closed too.
      const closedOn = (column: CalendarColumn) =>
        column.closed ??
        (room.hours.length && !column.availability.length
          ? DEFAULT_CLOSED
          : null);
      const dutiesOn = (date: string): RoomBlock[] =>
        windows
          .filter((one) => localDate(one.start) === date)
          .map((one) => {
            const range = {
              start: localMinutes(one.start),
              end: localMinutes(one.end) || 24 * 60,
            };
            return {
              key: one.id,
              ...range,
              person: personOf(one.specialistId),
              time: span(range),
            };
          })
          .sort((a, b) => a.start - b.start);

      const todayDate = dates.find((date) => columns.get(date)?.isToday);
      const todayColumn = todayDate ? columns.get(todayDate) : undefined;
      let today: RoomToday | null = null;
      if (todayDate && todayColumn) {
        const duties = dutiesOn(todayDate);
        const visits = todayColumn.visits
          .map((slot) => ({
            key: slot.key,
            visitId: slot.visitId,
            start: slot.start,
            end: slot.end,
            time: span(slot),
            client: slot.client,
            person: personOf(slot.person.id, slot.person.name),
          }))
          .sort((a, b) => a.start - b.start);
        const edges = [...duties, ...visits, ...todayColumn.availability];
        today = {
          date: todayDate,
          range: {
            start: Math.min(
              8 * 60,
              ...edges.map((one) => Math.floor(one.start / 60) * 60),
            ),
            end: Math.max(
              20 * 60,
              ...edges.map((one) => Math.ceil(one.end / 60) * 60),
            ),
          },
          now: view.now?.minute ?? null,
          closed: closedOn(todayColumn),
          duties,
          visits,
        };
      }

      const byPerson = new Map<
        string,
        { minutes: number; weekdays: Set<number> }
      >();
      for (const one of windows) {
        const entry = byPerson.get(one.specialistId) ?? {
          minutes: 0,
          weekdays: new Set(),
        };
        entry.minutes += (one.end.getTime() - one.start.getTime()) / 60_000;
        entry.weekdays.add(isoWeekday(localDate(one.start)));
        byPerson.set(one.specialistId, entry);
      }
      const users = [...byPerson]
        .map(([id, entry]) => ({
          person: personOf(id),
          days: weekdaysLabel([...entry.weekdays].sort((a, b) => a - b)),
          hours: tenth(entry.minutes),
        }))
        .sort((a, b) => b.hours - a.hours);

      // The schedule: the calendar's room columns, the duties drawn as
      // the available time (a person a "place", in their colour).
      const scheduleColumns = view.days.flatMap((day) => {
        const column = columns.get(day.date);
        if (!column) return [];
        const index = dates.indexOf(day.date);
        return [
          {
            ...column,
            key: `${room.id}:${day.date}`,
            title: WEEKDAY_SHORT[index]!,
            subtitle: formatDayMonth(day.date),
            closed: closedOn(column),
            availability: dutiesOn(day.date).map((duty) => ({
              key: duty.key,
              start: duty.start,
              end: duty.end,
              time: duty.time,
              place: personPlace(duty.person),
              adjacentToPrevious: false,
              label: `Dyżur: ${duty.person.name}, ${duty.time}`,
            })),
          },
        ];
      });
      const schedule = {
        range: scheduleRange(
          scheduleColumns.flatMap((one) => [
            ...one.availability,
            ...one.visits,
            ...columns.get(one.date)!.availability,
          ]),
        ),
        now: view.now,
        columns: scheduleColumns,
      };

      const occupancy = view.summary.items.find(
        (one) => one.id === room.id,
      )?.occupancy;
      return [
        room.id,
        {
          days: dates.map((date, index) =>
            roomDay(date, index, columns.get(date)),
          ),
          occupancy: occupancy ?? {
            visitCount: 0,
            bookedMinutes: 0,
            availableMinutes: 0,
            bookedHours: 0,
            availableHours: 0,
            freeHours: 0,
            percent: 0,
            overbooked: false,
            overMinutes: 0,
          },
          today,
          now: today ? roomNow(today) : null,
          users,
          schedule,
        },
      ] as const;
    }),
  );
}

/** The schedule without the days the room is closed (all day). */
export function openDaysOnly(
  schedule: RoomWeekView["schedule"],
): RoomWeekView["schedule"] {
  return {
    ...schedule,
    columns: schedule.columns.filter((column) => !column.closed),
  };
}
