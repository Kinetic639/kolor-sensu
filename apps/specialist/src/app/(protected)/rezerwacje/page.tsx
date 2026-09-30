import { createClient } from "@/lib/supabase/server";
import { visitEventRows, visitRows } from "@repo/scheduling";
import {
  getBookingWindow,
  getVisit,
  listActiveRoomsForSpecialist,
  listAvailableServicesForSpecialist,
  listVisitEvents,
  searchVisits,
} from "@repo/supabase";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import { RowActionLink, RowActions } from "@repo/ui/row-actions";
import {
  loadVisitTableParams,
  toVisitSearch,
  VisitPanel,
  VisitTable,
  VisitTableToolbar,
  visitPanelCloseHref,
  visitPanelTabs,
} from "@repo/ui/visit-table";

// Moje rezerwacje (R9): the specialist's own visits (even when they are also
// the centre's admin), with the client's contact and notes; no payments.
// The database searches, filters, sorts and pages; the visit open in the
// side panel is in the address. Changes go through the centre. The
// calendar views come in stage K.

const PATH = "/rezerwacje";

export default async function BookingsPage({
  searchParams,
}: PageProps<"/rezerwacje">) {
  const params = loadVisitTableParams(await searchParams);
  const client = await createClient();
  const window = await getBookingWindow(client);
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const [page, services, rooms, open, events] = await Promise.all([
    searchVisits(client, toVisitSearch(params, { own: true, timeZone })).catch(
      (error: unknown) => {
        console.error("[visits] searching failed:", error);
        return null;
      },
    ),
    listAvailableServicesForSpecialist(client).catch(() => []),
    listActiveRoomsForSpecialist(client).catch(() => []),
    params.wizyta
      ? getVisit(client, params.wizyta, { own: true }).catch(() => null)
      : null,
    params.wizyta && params.karta === "historia"
      ? listVisitEvents(client, params.wizyta, { own: true }).catch(() => [])
      : null,
  ]);

  if (!page) {
    return (
      <div className="space-y-5">
        <PageTitle>Moje rezerwacje</PageTitle>
        <EmptyState
          description="Twoje konto nie jest jeszcze powiązane z profilem specjalisty. Skontaktuj się z administratorem centrum."
          title="Brak profilu specjalisty"
        />
      </div>
    );
  }

  const rows = visitRows(page.visits, { timeZone });
  const openRow = open ? visitRows([open], { timeZone })[0]! : null;

  return (
    <div className="space-y-4">
      <PageTitle>Moje rezerwacje</PageTitle>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <VisitTable
            actions={Object.fromEntries(
              rows.map((row) => [
                row.id,
                <RowActions key={row.id} label={row.reference}>
                  {row.phone ? (
                    <RowActionLink href={`tel:${row.phone.replace(/\s/g, "")}`}>
                      Zadzwoń
                    </RowActionLink>
                  ) : null}
                  {row.email ? (
                    <RowActionLink href={`mailto:${row.email}`}>
                      Napisz e-mail
                    </RowActionLink>
                  ) : null}
                </RowActions>,
              ]),
            )}
            caption="Moje wizyty"
            params={params}
            path={PATH}
            rows={rows}
            toolbar={
              <VisitTableToolbar
                params={params}
                path={PATH}
                rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
                services={services.map((service) => ({
                  id: service.id,
                  name: service.name,
                }))}
              />
            }
            total={page.total}
          />
          <p className="text-sm text-[var(--text-muted)]">
            Zmianę lub odwołanie wizyty ustal z centrum.
          </p>
        </div>
        {open && openRow ? (
          <VisitPanel
            closeHref={visitPanelCloseHref(PATH, params)}
            events={
              events && open
                ? visitEventRows(events, {
                    timeZone,
                    currencyCode: open.currencyCode,
                  })
                : null
            }
            row={openRow}
            tab={params.karta}
            tabs={visitPanelTabs(PATH, params)}
          />
        ) : null}
      </div>
    </div>
  );
}
