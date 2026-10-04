import type {
  AdminRoomSummary,
  RoomAvailabilityException,
} from "@repo/contracts";
import {
  openingHoursByDay,
  summarizeOpeningHours,
  type OpeningHoursInterval,
  type RoomWeekView,
} from "@repo/scheduling";
import { rosterWeekSummary } from "@repo/ui/resource-roster";
import type { RoomRow } from "@repo/ui/rooms";
import { EXCEPTION_TYPE_LABELS } from "./exception-form";

// The rooms' roster rows: each room with its hours, its exceptions to
// come and its week (read off the calendar's room columns).

/** `Zablokowane godziny 16:00–20:00 · malowanie` */
export function exceptionText(exception: RoomAvailabilityException) {
  const reason = exception.reason?.trim();
  return [
    EXCEPTION_TYPE_LABELS[exception.type],
    exception.startsAt && exception.endsAt
      ? `${exception.startsAt}–${exception.endsAt}`
      : null,
  ]
    .filter(Boolean)
    .join(" ")
    .concat(reason ? ` · ${reason}` : "");
}

/** `12.10` */
const dayMonth = (date: string) =>
  `${Number(date.slice(8))}.${Number(date.slice(5, 7))}`;

export function toRoomRow(
  room: AdminRoomSummary,
  week: RoomWeekView,
  hours: OpeningHoursInterval[],
  /** The room's exceptions from today on. */
  exceptions: RoomAvailabilityException[],
): RoomRow {
  return {
    id: room.id,
    name: room.name,
    color: room.color,
    href: `/gabinety/${room.id}`,
    location: room.locationName,
    capacity: room.capacity,
    sortOrder: room.sortOrder,
    active: room.active,
    // What the site shows: an active room, shown, with a published profile.
    onSite: room.active && room.publiclyVisible && room.publicProfilePublished,
    hoursSummary: summarizeOpeningHours(hours),
    openingHours: openingHoursByDay(hours),
    exceptions: exceptions.map((one) => ({
      key: one.id,
      date: dayMonth(one.date),
      text: exceptionText(one),
    })),
    // The week, without its schedule (the room's page draws that).
    days: week.days,
    occupancy: week.occupancy,
    today: week.today,
    now: week.now,
    users: week.users,
  };
}

/** The active rooms' week in a line: `Gabinety: 21 wizyt · 47% obłożenia`. */
export function roomsWeekSummary(rows: RoomRow[]) {
  return rosterWeekSummary(
    "Gabinety",
    rows.filter((row) => row.active).map((row) => row.occupancy),
  );
}
