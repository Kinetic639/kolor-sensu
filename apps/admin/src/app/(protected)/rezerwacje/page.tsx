import { CentreVisitToolbar } from "@/features/visits/cancel-visit";
import { loadAdminVisits } from "@/features/visits/loaders";
import { countVisitViewsAction } from "@/features/visits/actions";
import { VisitActions } from "@/features/visits/visit-actions";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import {
  columnsCookieName,
  currentView,
  loadVisitTableParams,
  parseColumnLayout,
  parseColumnWidths,
  viewHref,
  visitColumnsAvailable,
  VisitFilterBar,
  VisitPanel,
  visitPanelCloseHref,
  visitPanelTabs,
  VisitTable,
  VisitViewMenu,
  visitViews,
  widthsCookieName,
} from "@repo/ui/visit-table";
import { cookies } from "next/headers";

// Rezerwacje (R9): the bookings table, edge to edge. The database
// searches, filters, sorts and pages; the address holds the state (the
// visit open in the side panel too); the filters last as long as it does.
// The person's columns (which, their order, their widths) are kept in
// cookies. The centre cancels, moves and refunds from the row's menu or
// the panel.

const PATH = "/rezerwacje";
const TABLE = "rezerwacje";

const visitLabel = (row: {
  clientName: string;
  weekday: string;
  dateLabel: string;
  time: string;
}) => `${row.clientName}, ${row.weekday}, ${row.dateLabel}, ${row.time}`;

export default async function BookingsPage({
  searchParams,
}: PageProps<"/rezerwacje">) {
  const [query, cookieStore] = await Promise.all([searchParams, cookies()]);
  const params = loadVisitTableParams(query);
  const { rows, total, open, filters, avatars } = await loadAdminVisits(params);
  const columnsCookie = columnsCookieName(TABLE);
  const widthsCookie = widthsCookieName(TABLE);
  const columns = parseColumnLayout(
    cookieStore.get(columnsCookie)?.value,
    visitColumnsAvailable({ showPayment: true, showSpecialist: true }),
  );
  const view = currentView(params, true);

  return (
    <FullBleed>
      <PageTitle>Rezerwacje</PageTitle>
      <div className="flex min-h-0 flex-1">
        <VisitTable
          actions={Object.fromEntries(
            rows.map((row) => [
              row.id,
              <VisitActions
                key={row.id}
                visit={{
                  id: row.id,
                  reference: row.reference,
                  label: visitLabel(row),
                  phone: row.phone,
                  email: row.email,
                  refundableMinor: row.refundableMinor,
                  currencyCode: row.currencyCode,
                  cancellable: row.cancellable,
                  movable: row.movable,
                  date: row.date,
                }}
              />,
            ]),
          )}
          columns={columns}
          columnsCookie={columnsCookie}
          widths={parseColumnWidths(cookieStore.get(widthsCookie)?.value)}
          widthsCookie={widthsCookie}
          params={params}
          path={PATH}
          rows={rows}
          showPayment
          showSpecialist
          specialistAvatars={avatars}
          toolbar={
            <VisitFilterBar
              rooms={filters.rooms}
              services={filters.services}
              showPayments
              specialists={filters.specialists}
              view={
                <VisitViewMenu
                  countViews={countVisitViewsAction}
                  label={view?.label ?? "Własny widok"}
                  total={total}
                  views={visitViews(true).map((option) => ({
                    id: option.id,
                    label: option.label,
                    href: viewHref(PATH, params, option),
                    active: option.id === view?.id,
                  }))}
                />
              }
            />
          }
          total={total}
        />
        {open ? (
          <VisitPanel
            closeHref={visitPanelCloseHref(PATH, params)}
            events={open.events}
            row={open.row}
            client={open.client}
            specialistAvatar={avatars[open.row.specialistId]}
            tab={params.karta}
            tabs={visitPanelTabs(PATH, params, { client: true })}
            toolbar={
              <CentreVisitToolbar label={visitLabel(open.row)} row={open.row} />
            }
          />
        ) : null}
      </div>
    </FullBleed>
  );
}
