import { updateClientAction } from "@/features/clients/actions";
import { loadClients } from "@/features/clients/loaders";
import {
  ClientFilterBar,
  ClientPanel,
  clientPanelCloseHref,
  clientPanelTabs,
  ClientTable,
  EditClientButton,
  loadClientTableParams,
  parseClientLayout,
} from "@repo/ui/client-table";
import {
  columnsCookieName,
  parseWidths,
  widthsCookieName,
} from "@repo/ui/data-table";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { cookies } from "next/headers";

// Klienci (R15): everyone who booked, on the same table as the bookings,
// edge to edge. The database searches, filters, sorts and pages; the
// address holds the state (the client open in the side panel too). The
// person's columns (which, their order, their widths) are kept in cookies.

const PATH = "/klienci";
const TABLE = "klienci";

export default async function ClientsPage({
  searchParams,
}: PageProps<"/klienci">) {
  const [query, cookieStore] = await Promise.all([searchParams, cookies()]);
  const params = loadClientTableParams(query);
  const { rows, total, open } = await loadClients(params);
  const columnsCookie = columnsCookieName(TABLE);
  const widthsCookie = widthsCookieName(TABLE);
  const columns = parseClientLayout(cookieStore.get(columnsCookie)?.value);

  return (
    <FullBleed>
      <PageTitle>Klienci</PageTitle>
      <div className="flex min-h-0 flex-1">
        <ClientTable
          columns={columns}
          columnsCookie={columnsCookie}
          params={params}
          path={PATH}
          rows={rows}
          toolbar={
            <ClientFilterBar order={columns.map((column) => column.id)} />
          }
          total={total}
          widths={parseWidths(cookieStore.get(widthsCookie)?.value)}
          widthsCookie={widthsCookie}
        />
        {open ? (
          <ClientPanel
            cancelled={open.client.cancelled}
            closeHref={clientPanelCloseHref(PATH, params)}
            edit={
              <EditClientButton
                action={updateClientAction}
                clientId={open.client.id}
                details={{
                  firstName: open.client.firstName,
                  lastName: open.client.lastName,
                  email: open.client.email,
                  phone: open.client.phone,
                  notes: open.client.notes,
                }}
              />
            }
            notes={open.client.notes}
            row={open.row}
            tab={params.karta}
            tabs={clientPanelTabs(PATH, params)}
            visits={open.visits}
          />
        ) : null}
      </div>
    </FullBleed>
  );
}
