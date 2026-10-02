import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE } from "@repo/scheduling";
import {
  listPendingSpecialistDrafts,
  listSettlements,
  listSpecialistsForAdmin,
  listVisits,
  searchVisits,
} from "@repo/supabase";

// The admin's dashboard (R14): today's visits, the reservations waiting to
// be paid, the money still owed to clients, and what else needs a look.
// The live updates (R13) refresh it as visits change.

/** The centre's date now, `2026-10-02`. */
export function localDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone }).format(now);
}

export async function loadAdminDashboard(now = new Date()) {
  const client = await createClient();
  const timeZone = DEFAULT_TIME_ZONE;
  const today = localDate(now, timeZone);
  const [todayVisits, waiting, settlements, specialists, pendingDrafts] =
    await Promise.all([
      listVisits(client, { from: today, to: today }),
      searchVisits(client, {
        statuses: ["awaiting_payment"],
        from: now.toISOString(),
        sort: "starts_at",
        descending: false,
        limit: 100,
        offset: 0,
      }),
      listSettlements(client),
      listSpecialistsForAdmin(client),
      listPendingSpecialistDrafts(client),
    ]);
  return {
    timeZone,
    now,
    todayVisits,
    waiting: waiting.visits,
    settlements,
    specialists,
    pendingDrafts,
  };
}
