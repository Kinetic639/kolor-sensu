import { createClient } from "@/lib/supabase/server";
import { clientRows, visitEventRows, visitRows } from "@repo/scheduling";
import {
  getCenterSettings,
  getVisit,
  getVisitClient,
  listRoomsAdmin,
  listServicesAdmin,
  listSpecialistSummariesForAdmin,
  listVisitEvents,
  searchVisits,
  signSpecialistPhotos,
} from "@repo/supabase";
import { toVisitSearch, type VisitTableParams } from "@repo/ui/visit-table";

// `/rezerwacje` (R9): one page of everyone's visits, searched, filtered and
// sorted by the database; what the filters offer; the visit open in the
// side panel (with its history on that tab).

type Specialists = Awaited<ReturnType<typeof listSpecialistSummariesForAdmin>>;

/**
 * The specialists' pictures for the table, by id: the account's, else the
 * published profile photo (signed), else none (initials).
 */
export async function specialistAvatars(
  client: Awaited<ReturnType<typeof createClient>>,
  specialists?: Specialists,
) {
  const list = specialists ?? (await listSpecialistSummariesForAdmin(client));
  const photos = await signSpecialistPhotos(
    client,
    list.map((one) => (one.avatarUrl ? null : one.publicProfilePhotoUrl)),
  );
  return Object.fromEntries(
    list.map((one) => [
      one.id,
      one.avatarUrl ??
        (one.publicProfilePhotoUrl
          ? (photos.get(one.publicProfilePhotoUrl) ?? null)
          : null),
    ]),
  );
}

export async function loadAdminVisits(params: VisitTableParams) {
  const client = await createClient();
  const settings = await getCenterSettings(client);
  const timeZone = settings.timezone;
  const history = params.wizyta && params.karta === "historia";
  const ofClient = params.wizyta && params.karta === "klient";
  // The pictures follow the specialists, alongside everything else.
  const specialistsLoaded = listSpecialistSummariesForAdmin(client);
  const [page, specialists, avatars, services, rooms, open, events, booker] =
    await Promise.all([
      searchVisits(client, toVisitSearch(params, { timeZone })),
      specialistsLoaded,
      specialistsLoaded.then((list) => specialistAvatars(client, list)),
      listServicesAdmin(client),
      listRoomsAdmin(client),
      params.wizyta ? getVisit(client, params.wizyta) : null,
      history ? listVisitEvents(client, params.wizyta!) : null,
      ofClient ? getVisitClient(client, params.wizyta!) : null,
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
