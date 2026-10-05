import type { ClientRow } from "@repo/scheduling";
import { Mail, Phone, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { ColumnsMenu } from "../data-table/columns-menu";
import type { ColumnWidths } from "../data-table/columns";
import {
  DataTable,
  pageState,
  TablePagination,
  TD,
} from "../data-table/data-table";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { RowActionLink, RowActions } from "../row-actions";
import { PAGE_SIZES } from "../visit-table/params";
import {
  CLIENT_COLUMN_SET,
  CLIENT_COLUMN_SORT,
  defaultClientLayout,
  type ClientColumnId,
  type ClientColumnLayout,
} from "./columns";
import {
  clientSortDirection,
  clientSortHref,
  clientTableHref,
  type ClientTableParams,
} from "./params";

// The centre's clients (docs/product/booking-plan.md, R15): the portals'
// table (../data-table) with a client a row, as the bookings table has
// visits. Searched, filtered and sorted by the database; the address holds
// the state. The name stays pinned; a click opens the client in the side
// panel; the "⋮" menu calls, writes or opens their card.

function Cell({ column, row }: { column: ClientColumnId; row: ClientRow }) {
  const muted = "text-[var(--text-muted)]";
  switch (column) {
    case "email":
      return (
        <td className={cn(TD, muted)} title={row.email}>
          {row.email}
        </td>
      );
    case "telefon":
      return (
        <td className={cn(TD, muted, "tabular-nums")}>{row.phone ?? "—"}</td>
      );
    case "wizyty":
      return <td className={cn(TD, "tabular-nums")}>{row.visits}</td>;
    case "nadchodzace":
      return (
        <td className={cn(TD, row.upcoming ? "text-[var(--primary)]" : muted)}>
          {row.upcoming ?? "—"}
        </td>
      );
    case "ostatnia":
      return <td className={cn(TD, "tabular-nums")}>{row.lastVisit}</td>;
    case "najblizsza":
      return <td className={cn(TD, "tabular-nums")}>{row.nextVisit}</td>;
    case "zaplacono":
      return <td className={cn(TD, "font-medium tabular-nums")}>{row.paid}</td>;
    case "dodany":
      return (
        <td className={cn(TD, muted, "tabular-nums")}>
          {row.since.replace(/^Klient od /, "")}
        </td>
      );
    case "notatka":
      return (
        <td className={cn(TD, muted)} title={row.notes ?? undefined}>
          {row.notes ?? ""}
        </td>
      );
  }
}

export interface ClientTableProps {
  path: string;
  params: ClientTableParams;
  rows: ClientRow[];
  /** All clients matching (not only this page). */
  total: number;
  /** The bar above: the search and the filters. */
  toolbar?: ReactNode;
  /** The person's columns (default: the usual ones). */
  columns?: ClientColumnLayout;
  /** Where the layout is kept; without it, no "Kolumny" menu. */
  columnsCookie?: string;
  widths?: ColumnWidths;
  widthsCookie?: string;
}

export function ClientTable({
  path,
  params,
  rows,
  total,
  toolbar,
  columns,
  columnsCookie,
  widths,
  widthsCookie,
}: ClientTableProps) {
  const layout = columns ?? defaultClientLayout();
  const shown = layout.filter((column) => column.shown).map((c) => c.id);
  const { page, pages, range } = pageState(
    { page: params.strona, size: params.wierszy },
    total,
    rows.length,
  );
  const sortOf = (by: ClientTableParams["sort"]) => ({
    href: clientSortHref(path, params, by),
    direction: params.sort === by ? clientSortDirection(params) : null,
  });

  return (
    <DataTable
      actions={(row) => (
        <RowActions label={row.name}>
          <RowActionLink
            href={row.href}
            icon={<UserRound aria-hidden="true" className="size-4" />}
          >
            Karta klienta
          </RowActionLink>
          {row.phone ? (
            <RowActionLink
              href={`tel:${row.phone.replace(/\s/g, "")}`}
              icon={<Phone aria-hidden="true" className="size-4" />}
            >
              Zadzwoń
            </RowActionLink>
          ) : null}
          <RowActionLink
            href={`mailto:${row.email}`}
            icon={<Mail aria-hidden="true" className="size-4" />}
          >
            Napisz e-mail
          </RowActionLink>
        </RowActions>
      )}
      caption="Klienci"
      cell={(row, column) => (
        <Cell column={column as ClientColumnId} key={column} row={row} />
      )}
      columns={shown.map((id) => {
        const by = CLIENT_COLUMN_SORT[id];
        return {
          id,
          label: CLIENT_COLUMN_SET.labels[id],
          sort: by ? sortOf(by) : undefined,
        };
      })}
      empty={
        params.strona > 1 && !params.q
          ? "Na tej stronie nie ma już klientów."
          : "Żaden klient nie pasuje do wyszukiwania i filtrów. Usuń któryś filtr albo wybierz inny widok."
      }
      menu={
        columnsCookie ? (
          <ColumnsMenu
            cookie={columnsCookie}
            defaults={defaultClientLayout()}
            labels={CLIENT_COLUMN_SET.labels}
            layout={layout}
            pinnedLabel="Klient"
          />
        ) : undefined
      }
      pagination={
        <TablePagination
          nextHref={
            page < pages
              ? clientTableHref(path, params, { strona: page + 1 })
              : null
          }
          previousHref={
            page > 1
              ? clientTableHref(path, params, { strona: page - 1 })
              : null
          }
          range={range}
          sizes={PAGE_SIZES.map((size) => ({
            size,
            current: size === params.wierszy,
            href: clientTableHref(path, params, { wierszy: size, strona: 1 }),
          }))}
        />
      }
      pinned={(row, href, selected) => (
        <Link
          aria-current={selected ? "true" : undefined}
          className="block truncate rounded hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={href}
          scroll={false}
        >
          {row.name}
        </Link>
      )}
      pinnedSort={sortOf("nazwisko")}
      rowHref={(row) =>
        // A click opens the client in the side panel (again: closes it).
        clientTableHref(path, params, {
          klient: params.klient === row.id ? null : row.id,
        })
      }
      rowKey={(row) => row.id}
      rows={rows}
      selected={(row) => params.klient === row.id}
      set={CLIENT_COLUMN_SET}
      toolbar={toolbar}
      widths={widths}
      widthsCookie={widthsCookie}
    />
  );
}
