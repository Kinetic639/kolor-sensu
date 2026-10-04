import { panelIntake } from "@/lib/visit-intake";
import { centreSettings } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import {
  clientRows,
  sortVisits,
  visitEventRows,
  visitRows,
} from "@repo/scheduling";
import {
  getClient,
  getVisit,
  listClientVisits,
  listVisitEvents,
  searchClients,
} from "@repo/supabase";
import { toClientSearch, type ClientTableParams } from "@repo/ui/client-table";
import { sortDirection, type VisitTableParams } from "@repo/ui/visit-table";

// The centre's clients (R15): one page of the list from the database, and a
// client's card with their visits, sorted and paged here (a client has a
// few dozen at most), and the visit open in the side panel.

export async function loadClients(params: ClientTableParams) {
  const client = await createClient();
  const settings = await centreSettings();
  const timeZone = settings.timezone;
  // The client open in the side panel comes with the page: every tab at
  // once, so switching tabs asks for nothing.
  const [page, found, visits] = await Promise.all([
    searchClients(client, toClientSearch(params, { timeZone })),
    params.klient ? getClient(client, params.klient).catch(() => null) : null,
    params.klient ? listClientVisits(client, params.klient) : null,
  ]);
  return {
    rows: clientRows(page.clients, { timeZone }),
    total: page.total,
    open: found
      ? {
          client: found,
          row: clientRows([found], { timeZone })[0]!,
          visits: visitRows(sortVisits(visits ?? [], "termin", "desc"), {
            timeZone,
          }),
        }
      : null,
  };
}

/** The client's name, for the breadcrumb. */
export async function loadClientName(id: string) {
  const found = await getClient(await createClient(), id).catch(() => null);
  return found?.name ?? null;
}

export async function loadClientCard(id: string, params: VisitTableParams) {
  const client = await createClient();
  const settings = await centreSettings();
  const timeZone = settings.timezone;
  // Every tab of the open visit at once: switching tabs asks for nothing.
  const history = Boolean(params.wizyta);
  const [found, visits, open, events] = await Promise.all([
    getClient(client, id),
    listClientVisits(client, id),
    params.wizyta ? getVisit(client, params.wizyta) : null,
    history ? listVisitEvents(client, params.wizyta!) : null,
  ]);
  if (!found) return null;

  const sorted = sortVisits(visits, params.sort, sortDirection(params));
  const pages = Math.max(1, Math.ceil(sorted.length / params.wierszy));
  const page = Math.min(Math.max(1, params.strona), pages);
  const shown = sorted.slice(
    (page - 1) * params.wierszy,
    page * params.wierszy,
  );
  // Only this client's visits open in the panel.
  const own =
    open && visits.some((visit) => visit.id === open.id) ? open : null;

  return {
    client: found,
    row: clientRows([found], { timeZone })[0]!,
    visits: visitRows(shown, { timeZone }),
    total: sorted.length,
    open: own
      ? {
          row: visitRows([own], { timeZone })[0]!,
          events: events
            ? visitEventRows(events, {
                timeZone,
                currencyCode: own.currencyCode,
              })
            : null,
          // The questionnaire before a consultation, where there is one.
          intake: await panelIntake(client, own.id, timeZone),
        }
      : null,
  };
}
