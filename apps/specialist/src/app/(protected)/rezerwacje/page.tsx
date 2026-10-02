import { resendPaymentLinkAction } from "@/features/calendar/actions";
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
import { FullBleed } from "@repo/ui/full-bleed";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import { RowActionLink, RowActions } from "@repo/ui/row-actions";
import {
  columnsCookieName,
  currentView,
  loadVisitTableParams,
  parseColumnLayout,
  RememberView,
  rememberedView,
  ResendPaymentLinkButton,
  toVisitSearch,
  viewCookieName,
  viewHref,
  visitColumnsAvailable,
  VisitFilterBar,
  VisitPanel,
  visitPanelCloseHref,
  visitPanelTabs,
  VisitTable,
  VisitViewMenu,
  visitViews,
} from "@repo/ui/visit-table";
import type { Route } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

// Moje rezerwacje (R9): the specialist's own visits (even when they are also
// the centre's admin), with the client's contact and notes; no payments.
// The database searches, filters, sorts and pages; the visit open in the
// side panel is in the address. Changes go through the centre. The
// calendar views come in stage K. Their columns and last view are kept in
// cookies, as in the centre's table.

const PATH = "/rezerwacje";
const TABLE = "moje_rezerwacje";

export default async function BookingsPage({
  searchParams,
}: PageProps<"/rezerwacje">) {
  const [query, cookieStore, requestHeaders] = await Promise.all([
    searchParams,
    cookies(),
    headers(),
  ]);
  // Opened afresh without a view: the one they left.
  if (requestHeaders.get("rsc") !== "1" && Object.keys(query).length === 0) {
    const back = rememberedView(
      PATH,
      cookieStore.get(viewCookieName(TABLE))?.value,
    );
    if (back) redirect(back as Route);
  }
  const params = loadVisitTableParams(query);
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
  const columnsCookie = columnsCookieName(TABLE);
  const columns = parseColumnLayout(
    cookieStore.get(columnsCookie)?.value,
    visitColumnsAvailable({ showPayment: false, showSpecialist: false }),
  );
  const view = currentView(params, false);

  return (
    <FullBleed>
      <PageTitle>Moje rezerwacje</PageTitle>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
            columns={columns}
            columnsCookie={columnsCookie}
            params={params}
            path={PATH}
            rows={rows}
            toolbar={
              <VisitFilterBar
                rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
                services={services.map((service) => ({
                  id: service.id,
                  name: service.name,
                }))}
                showPayments={false}
                specialists={[]}
                view={
                  <VisitViewMenu
                    label={view?.label ?? "Własny widok"}
                    total={page.total}
                    views={visitViews(false).map((option) => ({
                      id: option.id,
                      label: option.label,
                      href: viewHref(PATH, params, option),
                      active: option.id === view?.id,
                    }))}
                  />
                }
              />
            }
            total={page.total}
          />
          <p className="border-t border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
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
            toolbar={
              openRow.resendable ? (
                <ResendPaymentLinkButton
                  action={resendPaymentLinkAction}
                  visitId={openRow.id}
                />
              ) : null
            }
          />
        ) : null}
      </div>
      <RememberView table={TABLE} />
    </FullBleed>
  );
}
