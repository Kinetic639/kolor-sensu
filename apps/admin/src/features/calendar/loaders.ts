import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  calendarWindows,
  dayView,
  visitEventRows,
  visitRows,
  weekView,
  type CalendarResource,
} from "@repo/scheduling";
import {
  getCenterSettings,
  getVisit,
  listAvailabilityRulesForSpecialists,
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
// or the week of one of them. Only the shown dates are read: everyone's
// availability rules in force then (expanded here, time off cut out), the
// booked visits, and the visit open in the side panel.

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
  const specialists: CalendarResource[] = active.map((one) => ({
    id: one.id,
    name:
      one.publicDisplayName ??
      (`${one.firstName} ${one.lastName}`.trim() || "Specjalista"),
    color: one.color,
  }));
  const rooms: CalendarResource[] = allRooms
    .filter((room) => room.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((room) => ({ id: room.id, name: room.name, color: room.color }));

  const byRoom = params.perspektywa === "gabinety";
  const resources = byRoom ? rooms : specialists;
  // A week is of one of them: the one asked for, else the first.
  const focus =
    period.view === "tydzien"
      ? (resources.find((one) => one.id === params.zasob) ??
        resources[0] ??
        null)
      : null;
  // A specialist's week needs only their hours and visits.
  const shownSpecialists =
    focus && !byRoom
      ? specialists.filter((one) => one.id === focus.id)
      : specialists;
  const ids = shownSpecialists.map((one) => one.id);
  const history = params.wizyta && params.karta === "historia";

  const [rules, timeOff, visits, photos, open, events] = await Promise.all([
    listAvailabilityRulesForSpecialists(client, {
      specialistIds: ids,
      from: period.from,
      to: period.to,
    }),
    listTimeOffForSpecialists(client, ids),
    listVisits(client, {
      from: period.from,
      to: period.to,
      ...(focus && !byRoom ? { specialistId: focus.id } : {}),
    }),
    // Pictures for the day's specialist columns: the account's, else the
    // published profile photo.
    period.view === "dzien" && !byRoom
      ? signSpecialistPhotos(
          client,
          active.map((one) =>
            one.avatarUrl ? null : one.publicProfilePhotoUrl,
          ),
        )
      : new Map<string, string>(),
    params.wizyta ? getVisit(client, params.wizyta).catch(() => null) : null,
    history ? listVisitEvents(client, params.wizyta!).catch(() => []) : null,
  ]);

  const windows = calendarWindows({
    specialists: shownSpecialists,
    rooms,
    rules,
    timeOff,
    from: period.from,
    to: period.to,
    timeZone,
  });
  const view =
    period.view === "dzien"
      ? dayView({
          date: period.date,
          timeZone,
          perspective: byRoom ? "rooms" : "specialists",
          resources,
          windows,
          visits,
          now,
        })
      : weekView({
          week: period.from,
          timeZone,
          resource: {
            kind: byRoom ? "room" : "specialist",
            id: focus?.id ?? "",
          },
          windows,
          visits,
          now,
        });

  return {
    today,
    view,
    resources,
    focusId: focus?.id ?? null,
    avatars: Object.fromEntries(
      active.map((one) => [
        one.id,
        one.avatarUrl ??
          (one.publicProfilePhotoUrl
            ? (photos.get(one.publicProfilePhotoUrl) ?? null)
            : null),
      ]),
    ),
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
