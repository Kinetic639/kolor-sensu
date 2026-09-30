import type { VisitRow, VisitTone } from "@repo/scheduling";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  RotateCcw,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { resourceColors } from "../resource-colors";
import {
  PAGE_SIZES,
  sortDirection,
  sortHref,
  visitTableHref,
  type VisitSortColumn,
  type VisitTableParams,
} from "./params";
import {
  VisitTableFilter,
  type VisitTableFilterOption,
} from "./visit-table-filter";
import { VisitTableSearch } from "./visit-table-search";

// The bookings table (docs/product/booking-plan.md, R9), rendered on the
// server: one page of visits the database searched, filtered and sorted,
// dense as in data-management software (one line a visit, a column a
// fact). The reference number and the actions stay in view when the table
// scrolls sideways. Sort headers, pages and filters are links (the state
// is the address); only the search box runs in the browser.

const TONE_DOT: Record<VisitTone, string> = {
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--text-subtle)]",
};

const TONE_TEXT: Record<VisitTone, string> = {
  success: "text-[var(--text)]",
  warning: "text-[var(--text)]",
  danger: "font-semibold text-[var(--danger)]",
  info: "text-[var(--text)]",
  neutral: "text-[var(--text-muted)]",
};

function Dot({ tone, children }: { tone: VisitTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", TONE_TEXT[tone])}>
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", TONE_DOT[tone])}
      />
      {children}
    </span>
  );
}

const shortDate = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const shortWeekday = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  timeZone: "UTC",
});

/** `czw.` and `01.10.2026` */
function dateCell(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  return { weekday: shortWeekday.format(day), date: shortDate.format(day) };
}

// Cells stuck to the left or right edge: their own background (following
// the row's hover) and a line where the rest scrolls under them.
const STICKY_LEFT = "sticky left-0 z-10 shadow-[inset_-1px_0_0_var(--border)]";
const STICKY_RIGHT = "sticky right-0 z-10 shadow-[inset_1px_0_0_var(--border)]";
const STICKY_BG = "bg-[var(--surface)] group-hover:bg-[var(--surface-subtle)]";

const TH =
  "h-9 border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 text-left text-xs font-semibold whitespace-nowrap text-[var(--text-muted)]";
const TD =
  "h-10 border-b border-[var(--border)] px-3 py-1.5 align-middle whitespace-nowrap group-last:border-b-0";

function SortHead({
  path,
  params,
  column,
  children,
  className,
}: {
  path: string;
  params: VisitTableParams;
  column: VisitSortColumn;
  children: ReactNode;
  className?: string;
}) {
  const sorted = params.sort === column ? sortDirection(params) : null;
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
        href={sortHref(path, params, column)}
        scroll={false}
      >
        {children}
        <Icon
          aria-hidden="true"
          className={cn("size-3.5", !sorted && "opacity-40")}
        />
      </Link>
    </th>
  );
}

function Head({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={cn(TH, className)} scope="col">
      {children}
    </th>
  );
}

export interface VisitTableToolbarProps {
  path: string;
  params: VisitTableParams;
  /** The specialist filter (admins). */
  specialists?: { id: string; name: string }[];
  /** "Zwrot do zlecenia" among the statuses (admins). */
  showRefunds?: boolean;
}

/** The search box and the filters, in one compact row. */
export function VisitTableToolbar({
  path,
  params,
  specialists,
  showRefunds = false,
}: VisitTableToolbarProps) {
  const option = (
    label: string,
    patch: Partial<VisitTableParams>,
    active: boolean,
  ): VisitTableFilterOption => ({
    label,
    href: visitTableHref(path, params, { ...patch, strona: 1 }),
    active,
  });

  const statuses = [
    option("Wszystkie", { status: null }, !params.status),
    option(
      "Potwierdzone",
      { status: "potwierdzone" },
      params.status === "potwierdzone",
    ),
    option(
      "Czeka na płatność",
      { status: "oczekujace" },
      params.status === "oczekujace",
    ),
    option("Odwołane", { status: "odwolane" }, params.status === "odwolane"),
    ...(showRefunds
      ? [
          option(
            "Zwrot do zlecenia",
            { status: "do-zwrotu" },
            params.status === "do-zwrotu",
          ),
        ]
      : []),
  ];
  const scopes = [
    option(
      "Nadchodzące",
      { zakres: "nadchodzace", kierunek: null },
      params.zakres === "nadchodzace",
    ),
    option(
      "Minione",
      { zakres: "minione", kierunek: null },
      params.zakres === "minione",
    ),
    option(
      "Wszystkie",
      { zakres: "wszystkie", kierunek: null },
      params.zakres === "wszystkie",
    ),
  ];
  const filtered = Boolean(
    params.q ||
    params.status ||
    params.specjalista ||
    params.zakres !== "nadchodzace",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <VisitTableSearch />
      <span className="ml-1 text-xs font-semibold text-[var(--text-muted)]">
        Filtruj:
      </span>
      <VisitTableFilter
        highlighted={params.zakres !== "nadchodzace"}
        label="Termin"
        options={scopes}
      />
      <VisitTableFilter
        highlighted={Boolean(params.status)}
        label="Status"
        options={statuses}
      />
      {specialists?.length ? (
        <VisitTableFilter
          highlighted={Boolean(params.specjalista)}
          label="Specjalista"
          options={[
            option("Wszyscy", { specjalista: null }, !params.specjalista),
            ...specialists.map((specialist) =>
              option(
                specialist.name,
                { specjalista: specialist.id },
                params.specjalista === specialist.id,
              ),
            ),
          ]}
        />
      ) : null}
      {filtered ? (
        <Link
          className="inline-flex h-8 items-center gap-1 rounded px-1.5 text-xs font-semibold text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={path}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Wyczyść filtry
        </Link>
      ) : null}
    </div>
  );
}

function PageButton({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: ReactNode;
}) {
  const className =
    "inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)]";
  if (!href) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cn(className, "text-[var(--text-subtle)] opacity-50")}
        role="link"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      aria-label={label}
      className={cn(
        className,
        "text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
      )}
      href={href}
      scroll={false}
    >
      {children}
    </Link>
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

/** Rows per page, the page count, and every way through the pages. */
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
  const to = (n: number) => visitTableHref(path, params, { strona: n });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
      <nav aria-label="Wierszy na stronie" className="flex items-center gap-1">
        <span className="mr-1">Wierszy na stronie:</span>
        {PAGE_SIZES.map((option) => (
          <Link
            aria-current={option === params.wierszy ? "true" : undefined}
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
              option === params.wierszy
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
            )}
            href={visitTableHref(path, params, {
              wierszy: option,
              strona: 1,
            })}
            key={option}
            scroll={false}
          >
            {option}
          </Link>
        ))}
      </nav>
      <nav aria-label="Strony" className="flex items-center gap-1.5">
        <span aria-live="polite" className="mr-2 tabular-nums">
          {range} · strona {page} z {pages}
        </span>
        <PageButton href={page > 1 ? to(1) : null} label="Pierwsza strona">
          <ChevronsLeft aria-hidden="true" className="size-4" />
        </PageButton>
        <PageButton
          href={page > 1 ? to(page - 1) : null}
          label="Poprzednia strona"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </PageButton>
        <PageButton
          href={page < pages ? to(page + 1) : null}
          label="Następna strona"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </PageButton>
        <PageButton
          href={page < pages ? to(pages) : null}
          label="Ostatnia strona"
        >
          <ChevronsRight aria-hidden="true" className="size-4" />
        </PageButton>
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
  /** Search and filters, above the table. */
  toolbar?: ReactNode;
  showSpecialist?: boolean;
  showPayment?: boolean;
  /** The "⋮" menu of each visit, by its id. */
  actions?: Record<string, ReactNode>;
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
  actions = {},
  caption = "Rezerwacje",
}: VisitTableProps) {
  const columns = 11 + Number(showSpecialist) + 2 * Number(showPayment);
  const sort = (column: VisitSortColumn, label: string, className?: string) => (
    <SortHead className={className} column={column} params={params} path={path}>
      {label}
    </SortHead>
  );

  return (
    <div className="space-y-3">
      {toolbar}

      <div className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[0.8125rem] leading-5 text-[var(--text)]">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <Head className={cn(STICKY_LEFT, "z-20")}>Numer</Head>
                {sort("termin", "Data")}
                <Head>Godzina</Head>
                {sort("klient", "Klient")}
                <Head>Telefon</Head>
                <Head>E-mail</Head>
                {sort("usluga", "Usługa")}
                <Head>Miejsce</Head>
                {showSpecialist ? sort("specjalista", "Specjalista") : null}
                {sort("status", "Status")}
                {showPayment ? <Head>Płatność</Head> : null}
                {showPayment ? sort("kwota", "Kwota", "text-right") : null}
                <Head>Uwagi</Head>
                <Head className={cn(STICKY_RIGHT, "z-20 w-12 text-center")}>
                  <span className="sr-only">Akcje</span>
                </Head>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-10 text-center text-sm text-[var(--text-muted)]"
                    colSpan={columns}
                  >
                    {params.strona > 1 && !params.q
                      ? "Na tej stronie nie ma już rezerwacji."
                      : "Brak rezerwacji pasujących do wyszukiwania i filtrów."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const day = dateCell(row.date);
                  const muted = row.cancelled && "text-[var(--text-muted)]";
                  return (
                    <tr
                      className="group hover:bg-[var(--surface-subtle)]"
                      key={row.id}
                    >
                      <th
                        className={cn(
                          TD,
                          STICKY_LEFT,
                          STICKY_BG,
                          "text-left font-semibold tabular-nums",
                        )}
                        scope="row"
                      >
                        {row.reference}
                      </th>
                      <td className={cn(TD, muted, "tabular-nums")}>
                        <span className="text-[var(--text-muted)]">
                          {day.weekday}
                        </span>{" "}
                        {day.date}
                      </td>
                      <td
                        className={cn(
                          TD,
                          muted,
                          "tabular-nums",
                          row.cancelled && "line-through",
                        )}
                      >
                        {row.time}
                      </td>
                      <td className={cn(TD, "font-semibold", muted)}>
                        {row.clientName}
                      </td>
                      <td
                        className={cn(
                          TD,
                          "text-[var(--text-muted)] tabular-nums",
                        )}
                      >
                        {row.phone ?? "—"}
                      </td>
                      <td
                        className={cn(
                          TD,
                          "max-w-56 truncate text-[var(--text-muted)]",
                        )}
                        title={row.email ?? undefined}
                      >
                        {row.email ?? "—"}
                      </td>
                      <td
                        className={cn(TD, "max-w-56 truncate", muted)}
                        title={row.serviceName}
                      >
                        {row.serviceName}
                      </td>
                      <td
                        className={cn(TD, muted)}
                        title={row.locationName ?? undefined}
                      >
                        {row.room}
                      </td>
                      {showSpecialist ? (
                        <td className={cn(TD, muted)}>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="size-2 shrink-0 rounded-full"
                              style={{
                                background: resourceColors(
                                  row.specialistColor,
                                  row.specialistId,
                                ).accent,
                              }}
                            />
                            {row.specialistName}
                          </span>
                        </td>
                      ) : null}
                      <td className={TD}>
                        <Dot tone={row.status.tone}>{row.status.label}</Dot>
                        {row.note ? (
                          <span className="ml-1.5 text-xs text-[var(--info)]">
                            · przełożona
                          </span>
                        ) : null}
                      </td>
                      {showPayment ? (
                        <td className={TD}>
                          {row.payment ? (
                            <Dot tone={row.payment.tone}>
                              {row.payment.label}
                            </Dot>
                          ) : null}
                        </td>
                      ) : null}
                      {showPayment ? (
                        <td
                          className={cn(TD, "text-right tabular-nums", muted)}
                        >
                          {row.amount}
                        </td>
                      ) : null}
                      <td
                        className={cn(
                          TD,
                          "max-w-64 truncate text-[var(--text-muted)]",
                        )}
                        title={row.notes ?? undefined}
                      >
                        {row.notes ?? ""}
                      </td>
                      <td
                        className={cn(
                          TD,
                          STICKY_RIGHT,
                          STICKY_BG,
                          "w-12 px-1.5 text-center",
                        )}
                      >
                        {actions[row.id]}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
