import { resendPaymentLinkAction } from "@/features/calendar/actions";
import { bookingWindow, myRooms, myServices } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { visitEventRows, visitRows } from "@repo/scheduling";
import { getVisit, listVisitEvents, searchVisits } from "@repo/supabase";
import { FullBleed } from "@repo/ui/full-bleed";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import { RowActionLink, RowActions } from "@repo/ui/row-actions";
import {
  columnsCookieName,
  loadVisitTableParams,
  parseColumnLayout,
  parseColumnWidths,
  ResendPaymentLinkButton,
  toVisitSearch,
  visitColumnsAvailable,
  VisitFilterBar,
  VisitPanel,
  visitPanelCloseHref,
  visitPanelTabs,
  VisitTable,
  widthsCookieName,
} from "@repo/ui/visit-table";
import { cookies } from "next/headers";

// Moje rezerwacje (R9): the specialist's own visits (even when they are also
// the centre's admin), with the client's contact and notes; no payments.
// The database searches, filters, sorts and pages; the visit open in the
// side panel is in the address. Changes go through the centre. The
// calendar views come in stage K. Their columns (which, their order, their
// widths) are kept in cookies, as in the centre's table.

const PATH = "/rezerwacje";
const TABLE = "moje_rezerwacje";

export default async function BookingsPage({
  searchParams,
}: PageProps<"/rezerwacje">) {
  const [query, cookieStore] = await Promise.all([searchParams, cookies()]);
  const params = loadVisitTableParams(query);
  const client = await createClient();
  const window = await bookingWindow().catch(() => null);
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const [page, services, rooms, open, events] = await Promise.all([
    searchVisits(client, toVisitSearch(params, { own: true, timeZone })).catch(
      (error: unknown) => {
        console.error("[visits] searching failed:", error);
        return null;
      },
    ),
    myServices().catch(() => []),
    myRooms().catch(() => []),
    params.wizyta
      ? getVisit(client, params.wizyta, { own: true }).catch(() => null)
      : null,
    // Every tab of the open visit at once: switching asks for nothing.
    params.wizyta
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
  const widthsCookie = widthsCookieName(TABLE);
  const columns = parseColumnLayout(
    cookieStore.get(columnsCookie)?.value,
    visitColumnsAvailable({ showPayment: false, showSpecialist: false }),
  );

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
            widths={parseColumnWidths(cookieStore.get(widthsCookie)?.value)}
            widthsCookie={widthsCookie}
            params={params}
            path={PATH}
            rows={rows}
            toolbar={
              <VisitFilterBar
                order={columns.map((column) => column.id)}
                rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
                services={services.map((service) => ({
                  id: service.id,
                  name: service.name,
                }))}
                showPayments={false}
                specialists={[]}
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
    </FullBleed>
  );
}
