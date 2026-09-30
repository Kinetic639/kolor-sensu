import type { VisitRow } from "@repo/scheduling";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { PageLink as Link } from "../public-site/page-link";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "../button";
import { cn } from "../lib/utils";
import { StatusBadge } from "../portal-content";
import { resourceColors } from "../resource-colors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";
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
// server: one page of visits the database searched, filtered and sorted.
// Sort headers, pages and filters are links (the state is the address);
// only the search box runs in the browser.

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
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead
      aria-sort={
        sorted === "asc"
          ? "ascending"
          : sorted === "desc"
            ? "descending"
            : undefined
      }
      className={className}
    >
      <Link
        className={cn(
          "-mx-2 inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
          sorted && "text-[var(--text)]",
        )}
        href={sortHref(path, params, column)}
        scroll={false}
      >
        {children}
        <Icon
          aria-hidden="true"
          className={cn("size-3.5", !sorted && "opacity-50")}
        />
      </Link>
    </TableHead>
  );
}

export interface VisitTableToolbarProps {
  path: string;
  params: VisitTableParams;
  /** The specialist filter (admins). */
  specialists?: { id: string; name: string }[];
  /** "Do zwrotu" among the statuses (admins). */
  showRefunds?: boolean;
}

/** Search, filters and a way back to everything. */
export function VisitTableToolbar({
  path,
  params,
  specialists,
  showRefunds = false,
}: VisitTableToolbarProps) {
  const href = (patch: Partial<VisitTableParams>) =>
    visitTableHref(path, params, { ...patch, strona: 1 });
  const option = (
    label: string,
    patch: Partial<VisitTableParams>,
    active: boolean,
  ): VisitTableFilterOption => ({ label, href: href(patch), active });

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
  const filtered =
    params.q ||
    params.status ||
    params.specjalista ||
    params.zakres !== "nadchodzace";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <VisitTableSearch />
      <div className="flex flex-wrap items-center gap-2">
        <VisitTableFilter label="Termin" options={scopes} />
        <VisitTableFilter label="Status" options={statuses} />
        {specialists?.length ? (
          <VisitTableFilter
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
          <Button asChild size="sm" variant="ghost">
            <Link href={path}>Wyczyść filtry</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PageLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <Button aria-label={label} disabled size="icon" variant="outline">
        {children}
      </Button>
    );
  }
  return (
    <Button asChild size="icon" variant="outline">
      <Link aria-label={label} href={href} scroll={false}>
        {children}
      </Link>
    </Button>
  );
}

/** "21–40 z 42", rows per page, and the pages. */
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
  const size = params.wierszy;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, params.strona), pages);
  const first = total ? (page - 1) * size + 1 : 0;
  const to = (n: number) => visitTableHref(path, params, { strona: n });

  return (
    <div className="flex flex-col gap-3 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">
        {total
          ? `${first}–${first + Math.max(shown, 1) - 1} z ${total}`
          : "Brak wyników"}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <nav
          aria-label="Wierszy na stronie"
          className="flex items-center gap-2"
        >
          <span>Wierszy:</span>
          {PAGE_SIZES.map((option) => (
            <Link
              aria-current={option === size ? "true" : undefined}
              className={cn(
                "rounded px-1.5 py-0.5 font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                option === size
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "hover:text-[var(--text)]",
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
          <span className="mr-2 whitespace-nowrap">
            Strona {page} z {pages}
          </span>
          <PageLink href={page > 1 ? to(1) : null} label="Pierwsza strona">
            <ChevronsLeft aria-hidden="true" className="size-4" />
          </PageLink>
          <PageLink
            href={page > 1 ? to(page - 1) : null}
            label="Poprzednia strona"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </PageLink>
          <PageLink
            href={page < pages ? to(page + 1) : null}
            label="Następna strona"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </PageLink>
          <PageLink
            href={page < pages ? to(pages) : null}
            label="Ostatnia strona"
          >
            <ChevronsRight aria-hidden="true" className="size-4" />
          </PageLink>
        </nav>
      </div>
    </div>
  );
}

export interface VisitTableProps {
  path: string;
  params: VisitTableParams;
  rows: VisitRow[];
  /** All visits matching (not only this page). */
  total: number;
  showSpecialist?: boolean;
  showPayment?: boolean;
  /** An action per visit id. */
  actions?: Record<string, ReactNode>;
  caption?: string;
}

export function VisitTable({
  path,
  params,
  rows,
  total,
  showSpecialist = false,
  showPayment = false,
  actions,
  caption = "Rezerwacje",
}: VisitTableProps) {
  const withActions = Boolean(actions);
  const columns =
    5 + Number(showSpecialist) + Number(showPayment) + Number(withActions);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader className="bg-[var(--surface-muted)]">
            <TableRow className="hover:bg-transparent">
              <SortHead column="termin" params={params} path={path}>
                Termin
              </SortHead>
              <SortHead column="klient" params={params} path={path}>
                Klient
              </SortHead>
              <SortHead column="usluga" params={params} path={path}>
                Usługa
              </SortHead>
              {showSpecialist ? (
                <SortHead column="specjalista" params={params} path={path}>
                  Specjalista
                </SortHead>
              ) : null}
              <SortHead column="status" params={params} path={path}>
                Status
              </SortHead>
              {showPayment ? (
                <SortHead column="kwota" params={params} path={path}>
                  Płatność
                </SortHead>
              ) : null}
              <TableHead>Numer</TableHead>
              {withActions ? (
                <TableHead>
                  <span className="sr-only">Akcje</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  className="py-10 text-center text-[var(--text-muted)]"
                  colSpan={columns}
                >
                  {params.strona > 1 && !params.q
                    ? "Na tej stronie nie ma już rezerwacji."
                    : "Brak rezerwacji pasujących do wyszukiwania i filtrów."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  className={cn(row.cancelled && "text-[var(--text-muted)]")}
                  key={row.id}
                >
                  <TableCell className="whitespace-nowrap">
                    <span className="block text-xs text-[var(--text-muted)] first-letter:uppercase">
                      {row.weekday}
                    </span>
                    <span className="block font-semibold">{row.dateLabel}</span>
                    <span
                      className={cn(
                        "block tabular-nums",
                        row.cancelled && "line-through",
                      )}
                    >
                      {row.time}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-44">
                    <span className="block font-semibold">
                      {row.clientName}
                    </span>
                    {row.contact
                      .filter((item) => item.label !== "Uwagi klienta")
                      .map((item) => (
                        <span
                          className="block text-xs break-words text-[var(--text-muted)]"
                          key={item.label}
                        >
                          <span className="sr-only">{item.label}: </span>
                          {item.value}
                        </span>
                      ))}
                    {row.contact
                      .filter((item) => item.label === "Uwagi klienta")
                      .map((item) => (
                        <span
                          className="mt-1 line-clamp-2 block text-xs text-[var(--text-muted)] italic"
                          key={item.label}
                          title={item.value}
                        >
                          Uwagi: {item.value}
                        </span>
                      ))}
                  </TableCell>
                  <TableCell className="min-w-40">
                    <span className="block">{row.serviceName}</span>
                    <span className="block text-xs text-[var(--text-muted)]">
                      {row.place}
                    </span>
                  </TableCell>
                  {showSpecialist ? (
                    <TableCell className="whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-2"
                        style={
                          {
                            "--specialist-accent": resourceColors(
                              row.specialistColor,
                              row.specialistId,
                            ).accent,
                          } as CSSProperties
                        }
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-full bg-[var(--specialist-accent)]"
                        />
                        {row.specialistName}
                      </span>
                    </TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge tone={row.status.tone}>
                        {row.status.label}
                      </StatusBadge>
                      {row.note ? (
                        <StatusBadge dot={false} tone="info">
                          {row.note}
                        </StatusBadge>
                      ) : null}
                    </div>
                  </TableCell>
                  {showPayment ? (
                    <TableCell className="whitespace-nowrap">
                      {row.payment ? (
                        <StatusBadge tone={row.payment.tone}>
                          {row.payment.label}
                        </StatusBadge>
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {row.reference}
                  </TableCell>
                  {withActions ? (
                    <TableCell className="text-right">
                      {actions?.[row.id]}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
