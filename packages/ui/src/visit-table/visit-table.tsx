import type { VisitRow } from "@repo/scheduling";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import {
  columnWidth,
  defaultColumnLayout,
  NUMBER_COLUMN_WIDTH,
  VISIT_COLUMN_LABELS,
  VISIT_COLUMN_SORT,
  VISIT_COLUMN_WIDTHS,
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
import { VisitColumnResizer } from "./visit-column-resizer";
import { VisitColumnsMenu } from "./visit-columns-menu";
import { VisitTableRow } from "./visit-table-row";

// The bookings table (docs/product/booking-plan.md, R9), rendered on the
// server: one page of visits the database searched, filtered and sorted,
// dense as a spreadsheet (a line a visit, thin grid lines). The reference
// number stays pinned left and the row's menu right when it scrolls
// sideways; the other columns are the person's own choice and order
// ("Kolumny", in the menu column's header). Headers sort, the footer pages;
// the state is the address.

const shortDay = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const ACTIONS_WIDTH = 40;

const PIN_LEFT = "sticky left-0 z-10 shadow-[inset_-1px_0_0_var(--border)]";
const PIN_RIGHT = "sticky right-0 z-10 shadow-[inset_1px_0_0_var(--border)]";
const PIN_BG =
  "bg-[var(--surface)] group-hover:bg-[var(--surface-subtle)] group-data-[selected]:bg-[var(--primary-soft)]";

const TH =
  "sticky top-0 z-20 h-8 overflow-hidden border-r border-b border-[var(--border)] bg-[var(--surface)] px-2 text-left text-[0.75rem] font-medium text-ellipsis whitespace-nowrap text-[var(--text-muted)] last:border-r-0";
const TD =
  "h-[30px] overflow-hidden border-r border-b border-[var(--border)] px-2 align-middle text-ellipsis whitespace-nowrap last:border-r-0";

function SortHead({
  path,
  params,
  column,
  resizer,
  className,
}: {
  path: string;
  params: VisitTableParams;
  column: VisitColumnId;
  /** The edge that sets the column's width, if widths are kept. */
  resizer?: ReactNode;
  className?: string;
}) {
  const label = VISIT_COLUMN_LABELS[column];
  const by = VISIT_COLUMN_SORT[column];
  if (!by) {
    return (
      <th className={cn(TH, className)} scope="col">
        {label}
        {resizer}
      </th>
    );
  }
  const sorted = params.sort === by ? sortDirection(params) : null;
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <th
      aria-sort={
        sorted === "asc"
          ? "ascending"
          : sorted === "desc"
            ? "descending"
            : undefined
      }
      className={cn(TH, className)}
      scope="col"
    >
      <Link
        className={cn(
          "inline-flex items-center gap-1 rounded hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
          sorted && "text-[var(--text)]",
        )}
        href={sortHref(path, params, by)}
        scroll={false}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn("size-3", !sorted && "opacity-40")}
        />
      </Link>
      {resizer}
    </th>
  );
}

function Cell({
  column,
  row,
  avatars,
}: {
  column: VisitColumnId;
  row: VisitRow;
  avatars: Record<string, string | null>;
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
      return <td className={cn(TD, "font-medium", muted)}>{row.clientName}</td>;
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

function pageState(params: VisitTableParams, total: number, shown: number) {
  const size = params.wierszy;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, params.strona), pages);
  const first = total ? (page - 1) * size + 1 : 0;
  return {
    pages,
    page,
    range: total
      ? `${first}–${first + Math.max(shown, 1) - 1} z ${total}`
      : "0 z 0",
  };
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
  const { page, pages, range } = pageState(params, total, shown);
  const step = (to: number, label: string, icon: ReactNode) =>
    to < 1 || to > pages ? (
      <span
        aria-disabled="true"
        aria-label={label}
        className="inline-grid size-6 place-items-center opacity-35"
        role="link"
      >
        {icon}
      </span>
    ) : (
      <Link
        aria-label={label}
        className="inline-grid size-6 place-items-center rounded-[4px] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        href={visitTableHref(path, params, { strona: to })}
        scroll={false}
      >
        {icon}
      </Link>
    );
  return (
    <div className="flex h-8 shrink-0 items-center gap-1 border-t border-[var(--border)] px-2 text-[0.75rem] text-[var(--text-muted)] tabular-nums">
      <nav
        aria-label="Wierszy na stronie"
        className="flex items-center gap-0.5"
      >
        <span className="mr-1">Wierszy:</span>
        {PAGE_SIZES.map((option) => (
          <Link
            aria-current={option === params.wierszy ? "true" : undefined}
            className={cn(
              "inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] px-1 font-medium focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
              option === params.wierszy
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]",
            )}
            href={visitTableHref(path, params, { wierszy: option, strona: 1 })}
            key={option}
            scroll={false}
          >
            {option}
          </Link>
        ))}
      </nav>
      <nav aria-label="Strony" className="ml-auto flex items-center gap-0.5">
        <span aria-live="polite" className="mr-1.5">
          {range}
        </span>
        {step(
          page - 1,
          "Poprzednia strona",
          <ChevronLeft aria-hidden="true" className="size-3.5" />,
        )}
        {step(
          page + 1,
          "Następna strona",
          <ChevronRight aria-hidden="true" className="size-3.5" />,
        )}
      </nav>
    </div>
  );
}

export interface VisitTableProps {
  path: string;
  params: VisitTableParams;
  rows: VisitRow[];
  /** All visits matching (not only this page). */
  total: number;
  /** The bar above: the view, the search and the filters. */
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
  caption = "Rezerwacje",
}: VisitTableProps) {
  const layout =
    columns ??
    defaultColumnLayout(visitColumnsAvailable({ showSpecialist, showPayment }));
  const shown = layout.filter((column) => column.shown).map((c) => c.id);
  // Fixed widths, the columns' own; a last empty column takes what is
  // left of a wide screen, so each column stays as wide as it was set.
  const minWidth =
    columnWidth("numer", widths) +
    ACTIONS_WIDTH +
    shown.reduce((sum, column) => sum + columnWidth(column, widths), 0);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--surface)]">
      {toolbar}
      <div className="min-h-0 flex-1 overflow-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-[0.8125rem] leading-5 text-[var(--text)]"
          style={{ minWidth }}
        >
          <caption className="sr-only">{caption}</caption>
          <colgroup>
            <col
              data-column="numer"
              data-width=""
              style={{ width: columnWidth("numer", widths) }}
            />
            {shown.map((column) => (
              <col
                data-column={column}
                data-width=""
                key={column}
                style={{ width: columnWidth(column, widths) }}
              />
            ))}
            <col />
            <col data-width="" style={{ width: ACTIONS_WIDTH }} />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(TH, PIN_LEFT, "z-30 pl-3")} scope="col">
                Numer
                {widthsCookie ? (
                  <VisitColumnResizer
                    column="numer"
                    cookie={widthsCookie}
                    label="Numer"
                    usualWidth={NUMBER_COLUMN_WIDTH}
                    width={columnWidth("numer", widths)}
                  />
                ) : null}
              </th>
              {shown.map((column) => (
                <SortHead
                  column={column}
                  key={column}
                  params={params}
                  path={path}
                  resizer={
                    widthsCookie ? (
                      <VisitColumnResizer
                        column={column}
                        cookie={widthsCookie}
                        label={VISIT_COLUMN_LABELS[column]}
                        usualWidth={VISIT_COLUMN_WIDTHS[column]}
                        width={columnWidth(column, widths)}
                      />
                    ) : null
                  }
                />
              ))}
              <th aria-hidden="true" className={cn(TH, "px-0")} />
              <th
                className={cn(TH, PIN_RIGHT, "z-30 w-10 px-1 text-center")}
                scope="col"
              >
                {columnsCookie ? (
                  <VisitColumnsMenu cookie={columnsCookie} layout={layout} />
                ) : (
                  <span className="sr-only">Akcje</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-10 text-center text-sm text-[var(--text-muted)]"
                  colSpan={shown.length + 3}
                >
                  {params.strona > 1 && !params.q
                    ? "Na tej stronie nie ma już rezerwacji."
                    : "Żadna wizyta nie pasuje do wyszukiwania i filtrów. Usuń któryś filtr albo wybierz inny widok."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = params.wizyta === row.id;
                // A click opens the visit in the side panel (again: closes it).
                const href = visitTableHref(path, params, {
                  wizyta: selected ? null : row.id,
                });
                return (
                  <VisitTableRow href={href} key={row.id} selected={selected}>
                    <th
                      className={cn(
                        TD,
                        PIN_LEFT,
                        PIN_BG,
                        "pl-3 text-left font-medium tabular-nums",
                      )}
                      scope="row"
                    >
                      <Link
                        aria-current={selected ? "true" : undefined}
                        className="rounded hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                        href={href}
                        scroll={false}
                      >
                        {row.reference}
                      </Link>
                    </th>
                    {shown.map((column) => (
                      <Cell
                        avatars={specialistAvatars}
                        column={column}
                        key={column}
                        row={row}
                      />
                    ))}
                    <td aria-hidden="true" className={cn(TD, "px-0")} />
                    <td
                      className={cn(
                        TD,
                        PIN_RIGHT,
                        PIN_BG,
                        "w-10 px-1 text-center",
                      )}
                    >
                      {actions[row.id]}
                    </td>
                  </VisitTableRow>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <VisitTablePagination
        params={params}
        path={path}
        shown={rows.length}
        total={total}
      />
    </div>
  );
}
