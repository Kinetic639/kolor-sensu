import "server-only";
import {
  centreSettings,
  rooms as loadRooms,
  specialistAvatars,
  specialistSummaries,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { addDays, mondayOf } from "@repo/scheduling";
import {
  listPendingSpecialistDrafts,
  listSettlements,
  listVisits,
  searchVisits,
} from "@repo/supabase";

// The admin's dashboard (R14): today's visits for the line of hours, the
// reservations waiting to be paid, the money still owed to clients, this
// week and the last (for the week's figures), and what else needs a look.
// The rooms, the team and their pictures come from the kept reference data;
// the live updates (R13) refresh the rest as visits change.

/** The centre's date now, `2026-10-02`. */
export function localDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone }).format(now);
}

/**
 * The dashboard, its line of hours on `day` (another than today: browsed
 * with the arrows); the figures stay today's.
 */
export async function loadAdminDashboard(
  day: string | null = null,
  now = new Date(),
) {
  const client = await createClient();
  const { timezone: timeZone } = await centreSettings();
  const today = localDate(now, timeZone);
  const shown = day ?? today;
  const monday = mondayOf(today);
  const [
    todayVisits,
    dayVisits,
    thisWeek,
    lastWeek,
    waiting,
    settlements,
    specialists,
    rooms,
    avatars,
    pendingDrafts,
  ] = await Promise.all([
    listVisits(client, { from: today, to: today }),
    shown === today ? null : listVisits(client, { from: shown, to: shown }),
    listVisits(client, { from: monday, to: addDays(monday, 6) }),
    listVisits(client, { from: addDays(monday, -7), to: addDays(monday, -1) }),
    searchVisits(client, {
      statuses: ["awaiting_payment"],
      from: now.toISOString(),
      sort: "starts_at",
      descending: false,
      limit: 100,
      offset: 0,
    }),
    listSettlements(client),
    specialistSummaries(),
    loadRooms(),
    specialistAvatars(),
    listPendingSpecialistDrafts(client),
  ]);
  return {
    timeZone,
    now,
    monday,
    today,
    day: shown,
    todayVisits,
    dayVisits: dayVisits ?? todayVisits,
    thisWeek,
    lastWeek,
    waiting: waiting.visits,
    settlements,
    specialists,
    rooms,
    avatars,
    pendingDrafts,
  };
}
