import "server-only";

import { requirePortalRole } from "@/lib/auth";
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
  getBookingWindow,
  getMySpecialist,
  getVisit,
  listActiveRoomsForSpecialist,
  listAvailabilityRulesForSpecialists,
  listTimeOff,
  listVisitEvents,
  listVisits,
} from "@repo/supabase";
import { calendarPeriod, type CalendarParams } from "@repo/ui/calendar-view";
import { formatInTimeZone } from "date-fns-tz";

// Mój kalendarz (stage K5): the specialist's own week (or day), their
// visits over their availability, time off cut out; the visit open in the
// side panel. Only their own: the database checks (p_own, RLS).

export async function loadMyCalendar(params: CalendarParams) {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const [specialist, booking] = await Promise.all([
    getMySpecialist(client, authorization.user.id),
    getBookingWindow(client),
  ]);
  if (!specialist) return null;

  const timeZone = booking?.timeZone ?? "Europe/Warsaw";
  const now = new Date();
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const period = calendarPeriod(params, { today, defaultView: "tydzien" });
  const history = params.wizyta && params.karta === "historia";

  const [rules, timeOff, rooms, visits, open, events] = await Promise.all([
    listAvailabilityRulesForSpecialists(client, {
      specialistIds: [specialist.id],
      from: period.from,
      to: period.to,
    }),
    listTimeOff(client, specialist.id),
    listActiveRoomsForSpecialist(client),
    listVisits(client, { from: period.from, to: period.to, own: true }),
    params.wizyta
      ? getVisit(client, params.wizyta, { own: true }).catch(() => null)
      : null,
    history
      ? listVisitEvents(client, params.wizyta!, { own: true }).catch(() => [])
      : null,
  ]);

  const me: CalendarResource = {
    id: specialist.id,
    name:
      [authorization.profile.first_name, authorization.profile.last_name]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" ") || "Ja",
    color: specialist.color,
  };
  const windows = calendarWindows({
    specialists: [me],
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      color: room.color,
    })),
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
          perspective: "specialists",
          resources: [me],
          windows,
          visits,
          now,
        })
      : weekView({
          week: period.from,
          timeZone,
          resource: { kind: "specialist", id: me.id },
          windows,
          visits,
          now,
        });

  return {
    today,
    view,
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
