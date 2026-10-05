import { CentreVisitToolbar } from "@/features/visits/cancel-visit";
import { loadAdminVisits } from "@/features/visits/loaders";
import { VisitActions } from "@/features/visits/visit-actions";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import {
  columnsCookieName,
  loadVisitTableParams,
  parseColumnLayout,
  parseColumnWidths,
  visitColumnsAvailable,
  VisitFilterBar,
  VisitPanel,
  visitPanelCloseHref,
  visitPanelTabs,
  VisitTable,
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

  return (
    <FullBleed>
      <PageTitle>Rezerwacje</PageTitle>
      <div className="flex min-h-0 flex-1">
        <VisitTable
          clientPath="/klienci"
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
              order={columns.map((column) => column.id)}
              rooms={filters.rooms}
              services={filters.services}
              showPayments
              specialists={filters.specialists}
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
            intake={open.intake}
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
