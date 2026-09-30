import { createClient } from "@/lib/supabase/server";
import { visitEventRows, visitRows } from "@repo/scheduling";
import {
  getCenterSettings,
  getVisit,
  listRoomsAdmin,
  listServicesAdmin,
  listSpecialistSummariesForAdmin,
  listVisitEvents,
  searchVisits,
} from "@repo/supabase";
import { toVisitSearch, type VisitTableParams } from "@repo/ui/visit-table";

// `/rezerwacje` (R9): one page of everyone's visits, searched, filtered and
// sorted by the database; what the filters offer; the visit open in the
// side panel (with its history on that tab); and how many refunds are
// still to settle.

export async function loadAdminVisits(params: VisitTableParams) {
  const client = await createClient();
  const settings = await getCenterSettings(client);
  const timeZone = settings.timezone;
  const history = params.wizyta && params.karta === "historia";
  const [page, owed, specialists, services, rooms, open, events] =
    await Promise.all([
      searchVisits(client, toVisitSearch(params, { timeZone })),
      searchVisits(client, {
        payment: "refund_due",
        sort: "starts_at",
        descending: false,
        limit: 1,
        offset: 0,
      }),
      listSpecialistSummariesForAdmin(client),
      listServicesAdmin(client),
      listRoomsAdmin(client),
      params.wizyta ? getVisit(client, params.wizyta) : null,
      history ? listVisitEvents(client, params.wizyta!) : null,
    ]);

  return {
    timeZone,
    rows: visitRows(page.visits, { timeZone }),
    total: page.total,
    refundsToSettle: owed.total,
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
    filters: {
      specialists: specialists
        .filter((specialist) => specialist.active)
        .map((specialist) => ({
          id: specialist.id,
          name:
            specialist.publicDisplayName ??
            `${specialist.firstName} ${specialist.lastName}`.trim(),
        })),
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
      })),
      rooms: rooms.map((room) => ({ id: room.id, name: room.name })),
    },
  };
}
