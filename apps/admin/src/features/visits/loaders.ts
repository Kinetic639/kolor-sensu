import { createClient } from "@/lib/supabase/server";
import { visitRows } from "@repo/scheduling";
import {
  getCenterSettings,
  listSpecialistSummariesForAdmin,
  searchVisits,
} from "@repo/supabase";
import { toVisitSearch, type VisitTableParams } from "@repo/ui/visit-table";

// `/kalendarz` (R9): one page of everyone's visits, searched, filtered and
// sorted by the database; the specialists for the filter; and how many
// refunds are still to settle.

export async function loadAdminVisits(params: VisitTableParams) {
  const client = await createClient();
  const [settings, page, owed, specialists] = await Promise.all([
    getCenterSettings(client),
    searchVisits(client, toVisitSearch(params)),
    searchVisits(client, {
      refundDue: true,
      sort: "starts_at",
      descending: false,
      limit: 1,
      offset: 0,
    }),
    listSpecialistSummariesForAdmin(client),
  ]);

  return {
    rows: visitRows(page.visits, { timeZone: settings.timezone }),
    total: page.total,
    refundsToSettle: owed.total,
    specialists: specialists
      .filter((specialist) => specialist.active)
      .map((specialist) => ({
        id: specialist.id,
        name:
          specialist.publicDisplayName ??
          `${specialist.firstName} ${specialist.lastName}`.trim(),
      })),
  };
}
