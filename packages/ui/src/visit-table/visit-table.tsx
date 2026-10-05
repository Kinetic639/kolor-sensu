import type { VisitRow } from "@repo/scheduling";
import type { ReactNode } from "react";
import {
  DataTable,
  pageState,
  TablePagination,
  TD,
} from "../data-table/data-table";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import {
  defaultColumnLayout,
  VISIT_COLUMN_LABELS,
  VISIT_COLUMN_SET,
  VISIT_COLUMN_SORT,
  VISIT_COLUMNS,
  type ColumnLayout,
  type ColumnWidths,
  type VisitColumnId,
} from "./columns";
import {
  PAGE_SIZES,
  sortDirection,
  sortHref,
  visitTableHref,
  type VisitTableParams,
} from "./params";
import { PlaceLabel, SpecialistChip, Tag } from "./visit-chips";
import { VisitColumnsMenu } from "./visit-columns-menu";

// The bookings table (docs/product/booking-plan.md, R9): the portals' table
// (../data-table) with a visit a row. The reference number stays pinned
// left and the row's menu right; the other columns are the person's own
// choice, order and widths ("Kolumny", in the menu column's header).
// Headers sort, the footer pages; the state is the address.

const shortDay = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function Cell({
  column,
  row,
  avatars,
  clientPath,
}: {
  column: VisitColumnId;
  row: VisitRow;
  avatars: Record<string, string | null>;
  clientPath?: string;
}) {
  const muted = row.cancelled && "text-[var(--text-muted)]";
  switch (column) {
    case "termin":
      return (
        <td
          className={cn(TD, "tabular-nums", muted)}
          title={`${row.weekday}, ${row.dateLabel}, ${row.time}`}
        >
          {shortDay.format(new Date(`${row.date}T12:00:00Z`))}
          <span className="text-[var(--text-muted)]"> · </span>
          <span className={cn(row.cancelled && "line-through")}>
            {row.time.split("–")[0]}
          </span>
        </td>
      );
    case "utworzono":
    case "zmiana": {
      // `01.10 · 14:32` (the year and all in its tooltip).
      const at = column === "utworzono" ? row.created : row.changed;
      return (
        <td
          className={cn(TD, "text-[var(--text-muted)] tabular-nums")}
          title={at ?? undefined}
        >
          {at ? (
            <>
              {at.slice(0, 5)}
              <span> · </span>
              {at.slice(-5)}
            </>
          ) : (
            "—"
          )}
        </td>
      );
    }
    case "klient":
      return (
        <td className={cn(TD, "font-medium", muted)}>
          {clientPath && row.clientId ? (
            // The client's card (the admin's table).
            <Link
              className="underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
              href={`${clientPath}/${row.clientId}`}
            >
              {row.clientName}
            </Link>
          ) : (
            row.clientName
          )}
        </td>
      );
    case "telefon":
      return (
        <td className={cn(TD, "text-[var(--text-muted)] tabular-nums")}>
          {row.phone ?? "—"}
        </td>
      );
    case "email":
      return (
        <td
          className={cn(TD, "max-w-56 truncate text-[var(--text-muted)]")}
          title={row.email ?? undefined}
        >
          {row.email ?? "—"}
        </td>
      );
    case "usluga":
      return (
        <td
          className={cn(TD, "max-w-56 truncate", muted)}
          title={row.serviceName}
        >
          {row.serviceName}
        </td>
      );
    case "miejsce":
      return (
        <td className={TD} title={row.locationName ?? undefined}>
          <PlaceLabel row={row} />
        </td>
      );
    case "specjalista":
      return (
        <td className={TD}>
          <SpecialistChip avatar={avatars[row.specialistId]} row={row} />
        </td>
      );
    case "status":
      return (
        <td className={TD}>
          <Tag tone={row.status.tone}>{row.status.label}</Tag>
          {row.note ? (
            <span className="ml-1.5 text-[0.75rem] text-[var(--info)]">
              przełożona
            </span>
          ) : null}
        </td>
      );
    case "platnosc":
      return (
        <td className={TD}>
          {row.payment ? (
            <Tag tone={row.payment.tone}>
              {row.payment.label} · {row.amount}
            </Tag>
          ) : (
            <span className="text-[var(--text-muted)] tabular-nums">
              {row.amount}
            </span>
          )}
        </td>
      );
    case "uwagi":
      return (
        <td
          className={cn(TD, "max-w-64 truncate text-[var(--text-muted)]")}
          title={row.notes ?? undefined}
        >
          {row.notes ?? ""}
        </td>
      );
  }
}

/** The columns a table has: payments and the specialist only where shown. */
export function visitColumnsAvailable({
  showSpecialist = false,
  showPayment = false,
}: {
  showSpecialist?: boolean;
  showPayment?: boolean;
}): VisitColumnId[] {
  return VISIT_COLUMNS.filter(
    (id) =>
      (id !== "specjalista" || showSpecialist) &&
      (id !== "platnosc" || showPayment),
  );
}

/** Rows per page, where in the list this is, and the way to the others. */
export function VisitTablePagination({
  path,
  params,
  total,
  shown,
}: {
  path: string;
  params: VisitTableParams;
  total: number;
  /** Rows on this page. */
  shown: number;
}) {
  const { page, pages, range } = pageState(
    { page: params.strona, size: params.wierszy },
    total,
    shown,
  );
  return (
    <TablePagination
      nextHref={
        page < pages ? visitTableHref(path, params, { strona: page + 1 }) : null
      }
      previousHref={
        page > 1 ? visitTableHref(path, params, { strona: page - 1 }) : null
      }
      range={range}
      sizes={PAGE_SIZES.map((size) => ({
        size,
        current: size === params.wierszy,
        href: visitTableHref(path, params, { wierszy: size, strona: 1 }),
      }))}
    />
  );
}

export interface VisitTableProps {
  path: string;
  params: VisitTableParams;
  rows: VisitRow[];
  /** All visits matching (not only this page). */
  total: number;
  /** The bar above: the search and the filters. */
  toolbar?: ReactNode;
  showSpecialist?: boolean;
  showPayment?: boolean;
  /** The person's columns (default: the usual ones). */
  columns?: ColumnLayout;
  /** Where the layout is kept; without it, no "Kolumny" menu. */
  columnsCookie?: string;
  /** The person's column widths (default: the usual ones). */
  widths?: ColumnWidths;
  /** Where the widths are kept; without it, the widths can't be changed. */
  widthsCookie?: string;
  /** The "⋮" menu of each visit, by its id. */
  actions?: Record<string, ReactNode>;
  /** Specialists' pictures, by their id (initials where none). */
  specialistAvatars?: Record<string, string | null>;
  /** Where the clients' cards are (`/klienci`): the client's name links there. */
  clientPath?: string;
  caption?: string;
}

export function VisitTable({
  path,
  params,
  rows,
  total,
  toolbar,
  showSpecialist = false,
  showPayment = false,
  columns,
  columnsCookie,
  widths = {},
  widthsCookie,
  actions = {},
  specialistAvatars = {},
  clientPath,
  caption = "Rezerwacje",
}: VisitTableProps) {
  const layout =
    columns ??
    defaultColumnLayout(visitColumnsAvailable({ showSpecialist, showPayment }));
  const shown = layout.filter((column) => column.shown).map((c) => c.id);

  return (
    <DataTable
      actions={(row) => actions[row.id]}
      caption={caption}
      cell={(row, column) => (
        <Cell
          avatars={specialistAvatars}
          clientPath={clientPath}
          column={column as VisitColumnId}
          key={column}
          row={row}
        />
      )}
      columns={shown.map((id) => {
        const by = VISIT_COLUMN_SORT[id];
        return {
          id,
          label: VISIT_COLUMN_LABELS[id],
          sort: by
            ? {
                href: sortHref(path, params, by),
                direction: params.sort === by ? sortDirection(params) : null,
              }
            : undefined,
        };
      })}
      empty={
        params.strona > 1 && !params.q
          ? "Na tej stronie nie ma już rezerwacji."
          : "Żadna wizyta nie pasuje do wyszukiwania i filtrów. Usuń któryś filtr albo wybierz inny widok."
      }
      menu={
        columnsCookie ? (
          <VisitColumnsMenu cookie={columnsCookie} layout={layout} />
        ) : undefined
      }
      pagination={
        <VisitTablePagination
          params={params}
          path={path}
          shown={rows.length}
          total={total}
        />
      }
      pinned={(row, href, selected) => (
        <Link
          aria-current={selected ? "true" : undefined}
          className="rounded tabular-nums hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={href}
          scroll={false}
        >
          {row.reference}
        </Link>
      )}
      rowHref={(row) =>
        // A click opens the visit in the side panel (again: closes it).
        visitTableHref(path, params, {
          wizyta: params.wizyta === row.id ? null : row.id,
        })
      }
      rowKey={(row) => row.id}
      rows={rows}
      selected={(row) => params.wizyta === row.id}
      set={VISIT_COLUMN_SET}
      toolbar={toolbar}
      widths={widths}
      widthsCookie={widthsCookie}
    />
  );
}
