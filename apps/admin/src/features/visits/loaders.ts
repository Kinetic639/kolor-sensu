import "server-only";
import {
  centreSettings,
  rooms as loadRooms,
  services as loadServices,
  specialistAvatars,
  specialistSummaries,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { clientRows, visitEventRows, visitRows } from "@repo/scheduling";
import {
  getVisit,
  getVisitClient,
  listVisitEvents,
  searchVisits,
} from "@repo/supabase";
import { panelIntake } from "@/lib/visit-intake";
import { toVisitSearch, type VisitTableParams } from "@repo/ui/visit-table";
import { panelClosing } from "@/lib/visit-closing";
import { discountLabelOf } from "@/lib/visit-discount";
import { getVisitDiscount } from "@repo/supabase/discount-codes";

// `/rezerwacje` (R9): one page of everyone's visits, searched, filtered and
// sorted by the database; what the filters offer (kept between requests,
// @/lib/reference-data); the visit open in the side panel with all its
// tabs at once (details with the questionnaire before a consultation,
// history, client), so switching tabs asks the server for nothing.

export async function loadAdminVisits(params: VisitTableParams) {
  const client = await createClient();
  const settings = await centreSettings();
  const timeZone = settings.timezone;
  const [
    page,
    specialists,
    avatars,
    services,
    rooms,
    open,
    events,
    booker,
    intake,
    discount,
  ] = await Promise.all([
    searchVisits(client, toVisitSearch(params, { timeZone })),
    specialistSummaries(),
    specialistAvatars(),
    loadServices(),
    loadRooms(),
    params.wizyta ? getVisit(client, params.wizyta) : null,
    params.wizyta ? listVisitEvents(client, params.wizyta) : null,
    params.wizyta ? getVisitClient(client, params.wizyta) : null,
    // The questionnaire before a consultation (none where not given).
    params.wizyta ? panelIntake(client, params.wizyta, timeZone) : null,
    params.wizyta
      ? getVisitDiscount(client, params.wizyta).catch(() => null)
      : null,
  ]);

  return {
    timeZone,
    avatars,
    rows: visitRows(page.visits, { timeZone }),
    total: page.total,
    open: open
      ? {
          row: visitRows([open], { timeZone })[0]!,
          events: events
            ? visitEventRows(events, {
                timeZone,
                currencyCode: open.currencyCode,
              })
            : null,
          client: booker
            ? {
                row: clientRows([booker], { timeZone })[0]!,
                notes: booker.notes,
              }
            : null,
          intake,
          discount: discountLabelOf(discount),
          // Its closing (a held visit once begun).
          closing: await panelClosing(client, open),
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
