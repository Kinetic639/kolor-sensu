import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  calendarWindows,
  dayView,
  visitEventRows,
  visitRows,
  weekComparison,
  type CalendarPerson,
  type CalendarRoom,
} from "@repo/scheduling";
import {
  getCenterSettings,
  getVisit,
  listAvailabilityRulesForSpecialists,
  listCentreOffers,
  listRoomSchedules,
  listRoomsAdmin,
  listSpecialistSummariesForAdmin,
  listTimeOffForSpecialists,
  listVisitEvents,
  listVisits,
  signSpecialistPhotos,
} from "@repo/supabase";
import { calendarPeriod, type CalendarParams } from "@repo/ui/calendar-view";
import { formatInTimeZone } from "date-fns-tz";

// Kalendarz (stage K5): the centre's day, a column per specialist or room,
// or the week compared. Only the shown dates are read, in parallel:
// everyone's availability rules in force then (expanded here, time off
// cut out and kept as blocked time), the rooms' hours and exceptions, the
// booked visits, and the visit open in the side panel (or the offers, for
// the new visit's form, or the visit being moved).

export async function loadAdminCalendar(params: CalendarParams) {
  const client = await createClient();
  const [settings, summaries, allRooms] = await Promise.all([
    getCenterSettings(client),
    listSpecialistSummariesForAdmin(client),
    listRoomsAdmin(client),
  ]);
  const timeZone = settings.timezone;
  const now = new Date();
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const period = calendarPeriod(params, { today, defaultView: "dzien" });

  const active = summaries.filter((one) => one.active);
  const activeRooms = allRooms
    .filter((room) => room.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  // The locations to choose from: those of the active rooms.
  const locations = [
    ...new Map(activeRooms.map((room) => [room.locationId, room.locationName])),
  ].map(([value, label]) => ({ value, label }));

  // Where the calendar looks: one location's rooms, online, or everywhere.
  const where = params.lokalizacja;
  const shownRooms =
    where === "online"
      ? []
      : activeRooms.filter((room) => !where || room.locationId === where);
  const placeAllowed = (placeId: string) =>
    !where ||
    (where === "online"
      ? placeId === "online"
      : shownRooms.some((room) => room.id === placeId));

  const ids = active.map((one) => one.id);
  const history = params.wizyta && params.karta === "historia";
  // The new visit's form needs the offers (only when it is open).
  const booking = params.nowa && params.termin;
  const [
    rules,
    timeOff,
    schedules,
    visits,
    photos,
    open,
    events,
    offers,
    moving,
  ] = await Promise.all([
    listAvailabilityRulesForSpecialists(client, {
      specialistIds: ids,
      from: period.from,
      to: period.to,
    }),
    listTimeOffForSpecialists(client, ids),
    listRoomSchedules(client, {
      roomIds: shownRooms.map((room) => room.id),
      from: period.from,
      to: period.to,
    }),
    listVisits(client, { from: period.from, to: period.to }),
    // Pictures: the account's, else the published profile photo.
    signSpecialistPhotos(
      client,
      active.map((one) => (one.avatarUrl ? null : one.publicProfilePhotoUrl)),
    ),
    params.wizyta ? getVisit(client, params.wizyta).catch(() => null) : null,
    history ? listVisitEvents(client, params.wizyta!).catch(() => []) : null,
    booking ? listCentreOffers(client) : null,
    params.przesun ? getVisit(client, params.przesun).catch(() => null) : null,
  ]);

  const people: CalendarPerson[] = active.map((one) => ({
    id: one.id,
    name:
      one.publicDisplayName ??
      (`${one.firstName} ${one.lastName}`.trim() || "Specjalista"),
    title: one.professionalTitle,
    avatarUrl:
      one.avatarUrl ??
      (one.publicProfilePhotoUrl
        ? (photos.get(one.publicProfilePhotoUrl) ?? null)
        : null),
    color: one.color,
  }));
  const rooms: CalendarRoom[] = shownRooms.map((room) => ({
    id: room.id,
    name: room.name,
    color: room.color,
    locationId: room.locationId,
    hours: schedules.hours.filter((one) => one.roomId === room.id),
    exceptions: schedules.exceptions.filter((one) => one.roomId === room.id),
  }));
  const expanded = calendarWindows({
    specialistIds: ids,
    rules,
    timeOff,
    from: period.from,
    to: period.to,
    timeZone,
  });
  const input = {
    timeZone,
    now,
    people,
    rooms,
    windows: expanded.windows.filter((one) => placeAllowed(one.placeId)),
    timeOff: expanded.timeOff,
    visits: visits.filter((visit) =>
      placeAllowed(
        visit.mode === "online" ? "online" : (visit.room?.id ?? "online"),
      ),
    ),
    query: params.q,
  };
  const perspective =
    params.perspektywa === "gabinety" ? "rooms" : ("specialists" as const);

  return {
    today,
    period,
    locations,
    booking: offers
      ? {
          offers,
          specialists: people.map((one) => ({ id: one.id, name: one.name })),
          rooms: activeRooms.map((room) => ({
            id: room.id,
            name: room.name,
            locationName: room.locationName,
          })),
        }
      : null,
    day:
      period.view === "dzien"
        ? dayView({
            ...input,
            date: period.date,
            perspective,
            hideEmpty: params.puste,
          })
        : null,
    week:
      period.view === "tydzien"
        ? weekComparison({
            ...input,
            week: period.from,
            perspective,
            hideEmpty: params.puste,
          })
        : null,
    move: moving
      ? {
          row: visitRows([moving], { timeZone })[0]!,
          rooms: activeRooms.map((room) => ({
            id: room.id,
            name: room.name,
            locationName: room.locationName,
          })),
        }
      : null,
    open: open
      ? {
          row: visitRows([open], { timeZone })[0]!,
          events: events
            ? visitEventRows(events, {
                timeZone,
                currencyCode: open.currencyCode,
              })
            : null,
        }
      : null,
  };
}
