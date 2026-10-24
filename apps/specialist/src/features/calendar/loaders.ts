import { panelIntake } from "@/lib/visit-intake";
import { workshopBlockLabel } from "@repo/contracts/workshops";
import { listClosures } from "@repo/supabase/closures";
import { listWorkshopSeats } from "@repo/supabase/workshops-admin";
import "server-only";
import { panelClosing } from "@/lib/visit-closing";

import { requirePortalRole } from "@/lib/auth";
import { bookingWindow, myRooms } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import {
  calendarWindows,
  dayView,
  personalWeek,
  visitEventRows,
  visitRows,
  type CalendarPerson,
} from "@repo/scheduling";
import {
  getMySpecialist,
  getPortalAvatarUrl,
  getVisit,
  listAvailabilityRulesForSpecialists,
  listCentreOffers,
  listTimeOff,
  listVisitEvents,
  listVisits,
} from "@repo/supabase";
import { calendarPeriod, type CalendarParams } from "@repo/ui/calendar-view";
import { formatInTimeZone } from "date-fns-tz";

// Mój kalendarz (stage K5), after the reference: the specialist's own week
// (or day), their visits over their availability in its rooms' colours,
// time off as blocked time, the week summed up; the visit open in the side
// panel. Only their own: the database checks (p_own, RLS).

export async function loadMyCalendar(params: CalendarParams) {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const [specialist, booking, avatarUrl] = await Promise.all([
    getMySpecialist(client, authorization.user.id),
    bookingWindow(),
    getPortalAvatarUrl(client, {
      userId: authorization.user.id,
      accountAvatarUrl: authorization.profile.avatar_url,
    }),
  ]);
  if (!specialist) return null;

  const timeZone = booking?.timeZone ?? "Europe/Warsaw";
  const now = new Date();
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const period = calendarPeriod(params, { today, defaultView: "tydzien" });
  // Every tab of the open visit at once: switching tabs asks for nothing.
  const history = Boolean(params.wizyta);

  const withForm = params.nowa && params.termin;
  const [rules, timeOff, rooms, visits, open, events, offers] =
    await Promise.all([
      listAvailabilityRulesForSpecialists(client, {
        specialistIds: [specialist.id],
        from: period.from,
        to: period.to,
      }),
      listTimeOff(client, specialist.id),
      myRooms(),
      listVisits(client, { from: period.from, to: period.to, own: true }),
      params.wizyta
        ? getVisit(client, params.wizyta, { own: true }).catch(() => null)
        : null,
      history
        ? listVisitEvents(client, params.wizyta!, { own: true }).catch(() => [])
        : null,
      // The new visit's form: their own offers (RLS), only when it is open.
      withForm ? listCentreOffers(client) : null,
    ]);

  const me: CalendarPerson = {
    id: specialist.id,
    name:
      [authorization.profile.first_name, authorization.profile.last_name]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" ") || "Ja",
    title: specialist.professionalTitle,
    avatarUrl: avatarUrl ?? null,
    color: specialist.color,
  };
  // The workshops they lead say their seats too (#198).
  const seats = await listWorkshopSeats(
    client,
    timeOff.flatMap((one) => (one.workshopId ? [one.workshopId] : [])),
  );
  const expanded = calendarWindows({
    specialistIds: [specialist.id],
    rules,
    timeOff: timeOff.map((one) =>
      one.workshopId && one.reason
        ? {
            ...one,
            reason: workshopBlockLabel(one.reason, seats.get(one.workshopId)),
          }
        : one,
    ),
    from: period.from,
    to: period.to,
    timeZone,
  });
  // The days the whole centre is closed: shown, nothing to book.
  const closures = await listClosures(client);
  const input = {
    timeZone,
    closures,
    now,
    people: [me],
    // Only for the rooms' names and colours.
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      color: room.color,
      locationId: null,
      hours: [],
      exceptions: [],
    })),
    windows: expanded.windows,
    timeOff: expanded.timeOff,
    visits,
    query: params.q,
  };

  return {
    today,
    period,
    me,
    booking: offers
      ? {
          offers: offers.filter((offer) => offer.specialistId === me.id),
          specialists: [{ id: me.id, name: me.name }],
          rooms: rooms.map((room) => ({ id: room.id, name: room.name })),
        }
      : null,
    week:
      period.view === "tydzien"
        ? personalWeek({
            ...input,
            week: period.from,
            person: me,
            hideEmpty: params.puste,
          })
        : null,
    day:
      period.view === "dzien"
        ? dayView({ ...input, date: period.date, perspective: "specialists" })
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
          // The questionnaire before a consultation, where there is one.
          intake: await panelIntake(client, open.id, timeZone),
          // Its closing (a held visit once begun).
          closing: await panelClosing(client, open),
        }
      : null,
  };
}
