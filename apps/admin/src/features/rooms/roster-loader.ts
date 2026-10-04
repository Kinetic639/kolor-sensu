import "server-only";

import {
  centreSettings,
  rooms as loadRooms,
  specialistAvatars,
  specialistSummaries,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  calendarWindows,
  mondayOf,
  roomWeeks,
  type CalendarPerson,
} from "@repo/scheduling";
import {
  listAvailabilityRulesForSpecialists,
  listLocations,
  listRoomSchedules,
  listTimeOffForSpecialists,
  listVisits,
} from "@repo/supabase";
import { formatInTimeZone } from "date-fns-tz";
import { toRoomRow } from "./list-items";
import { toLocationOptions } from "./loaders";

// The rooms' roster (Gabinety): every room with the week asked for (any
// of its days; none: this one). Read at once for all the rooms: the
// specialists' availability and time off (their duties in the rooms), the
// visits, the rooms' hours and exceptions (those to come too), the
// locations (for "Dodaj gabinet"); the rooms, the team and their pictures
// come from the kept reference data.

/** How far ahead the exceptions are listed. */
const EXCEPTIONS_AHEAD_DAYS = 90;

/**
 * The rooms' weeks (the week asked for: any of its days; none: this one),
 * with what the roster needs; `only`: one room (its page).
 */
async function readRoomWeeks({
  day = null,
  only,
  now = new Date(),
}: {
  day?: string | null;
  only?: string;
  now?: Date;
}) {
  const client = await createClient();
  const [{ timezone: timeZone }, allRooms, summaries, avatars] =
    await Promise.all([
      centreSettings(),
      loadRooms(),
      specialistSummaries(),
      specialistAvatars(),
    ]);
  const rooms = only ? allRooms.filter((room) => room.id === only) : allRooms;
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const thisWeek = mondayOf(today);
  const week = day ? mondayOf(day) : thisWeek;
  const sunday = addDays(week, 6);

  const people: CalendarPerson[] = summaries
    .filter((one) => one.active)
    .map((one) => ({
      id: one.id,
      name:
        one.publicDisplayName ??
        (`${one.firstName} ${one.lastName}`.trim() || "Specjalista"),
      title: one.professionalTitle,
      avatarUrl: avatars[one.id] ?? null,
      color: one.color,
    }));
  const ids = people.map((one) => one.id);
  const lastDay = addDays(today, EXCEPTIONS_AHEAD_DAYS);
  const [rules, timeOff, schedules, visits] = await Promise.all([
    listAvailabilityRulesForSpecialists(client, {
      specialistIds: ids,
      from: week,
      to: sunday,
    }),
    listTimeOffForSpecialists(client, ids),
    listRoomSchedules(client, {
      roomIds: rooms.map((room) => room.id),
      from: week < today ? week : today,
      to: lastDay > sunday ? lastDay : sunday,
    }),
    listVisits(client, { from: week, to: sunday }),
  ]);

  const expanded = calendarWindows({
    specialistIds: ids,
    rules,
    timeOff,
    from: week,
    to: sunday,
    timeZone,
  });
  const ofRoom = <T extends { roomId: string }>(list: T[], roomId: string) =>
    list.filter((one) => one.roomId === roomId);
  const weeks = roomWeeks({
    timeZone,
    now,
    people,
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      color: room.color,
      locationId: room.locationId,
      hours: ofRoom(schedules.hours, room.id),
      exceptions: ofRoom(schedules.exceptions, room.id),
    })),
    windows: expanded.windows,
    timeOff: expanded.timeOff,
    visits,
    week,
  });

  return {
    today,
    week,
    thisWeek,
    weeks,
    rows: rooms.flatMap((room) => {
      const view = weeks.get(room.id);
      return view
        ? [
            toRoomRow(
              room,
              view,
              ofRoom(schedules.hours, room.id),
              ofRoom(schedules.exceptions, room.id).filter(
                (one) => one.date >= today,
              ),
            ),
          ]
        : [];
    }),
  };
}

/** The rooms' roster (Gabinety), and the locations for "Dodaj gabinet". */
export async function loadRoomsRoster(day: string | null = null) {
  const [read, locations] = await Promise.all([
    readRoomWeeks({ day }),
    createClient().then((client) => listLocations(client)),
  ]);
  return {
    week: read.week,
    thisWeek: read.thisWeek,
    rows: read.rows,
    locations: toLocationOptions(locations),
  };
}

/** A room's week on its page: its row (the overview) and its schedule. */
export async function loadRoomWeek(roomId: string, day: string | null = null) {
  const read = await readRoomWeeks({ day, only: roomId });
  const row = read.rows[0];
  const view = read.weeks.get(roomId);
  return row && view
    ? {
        today: read.today,
        week: read.week,
        thisWeek: read.thisWeek,
        row,
        schedule: view.schedule,
      }
    : null;
}
