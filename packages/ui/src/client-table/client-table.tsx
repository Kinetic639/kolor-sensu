import type { ClientRow } from "@repo/scheduling";
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
import { PAGE_SIZES } from "../visit-table/params";
import { VisitTableSearch } from "../visit-table/visit-table-search";
import {
  clientSortDirection,
  clientSortHref,
  clientTableHref,
  type ClientSortColumn,
  type ClientTableParams,
} from "./params";

// The centre's clients (docs/product/booking-plan.md, R15): one page from
// the database, searched and sorted there; the address holds the state.
// A client's name opens their card.

const TH =
  "h-9 border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 text-left text-xs font-semibold whitespace-nowrap text-[var(--text-muted)]";
const TD =
  "h-12 border-b border-[var(--border)] px-3 py-1.5 align-middle group-last:border-b-0";

function SortHead({
  path,
  params,
  column,
  children,
  className,
}: {
  path: string;
  params: ClientTableParams;
  column: ClientSortColumn;
  children: ReactNode;
  className?: string;
}) {
  const sorted = params.sort === column ? clientSortDirection(params) : null;
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
        href={clientSortHref(path, params, column)}
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

function Pagination({
  path,
  params,
  total,
  shown,
}: {
  path: string;
  params: ClientTableParams;
  total: number;
  shown: number;
}) {
  const size = params.wierszy;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, params.strona), pages);
  const first = total ? (page - 1) * size + 1 : 0;
  const range = total
    ? `${first}–${first + Math.max(shown, 1) - 1} z ${total}`
    : "0 z 0";
  const step = (to: number, label: string, icon: ReactNode) =>
    to < 1 || to > pages ? (
      <span
        aria-disabled="true"
        className="inline-flex size-7 items-center justify-center opacity-40"
      >
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    ) : (
      <Link
        className="inline-flex size-7 items-center justify-center rounded hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        href={clientTableHref(path, params, { strona: to })}
        scroll={false}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </Link>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
      <nav aria-label="Wierszy na stronie" className="flex items-center gap-1">
        <span className="mr-1">Wierszy na stronie:</span>
        {PAGE_SIZES.map((option) => (
          <Link
            aria-current={option === size ? "true" : undefined}
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
              option === size
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
            )}
            href={clientTableHref(path, params, { wierszy: option, strona: 1 })}
            key={option}
            scroll={false}
          >
            {option}
          </Link>
        ))}
      </nav>
      <nav aria-label="Strony" className="flex items-center gap-1">
        <span className="mr-1 tabular-nums">{range}</span>
        {step(
          page - 1,
          "Poprzednia strona",
          <ChevronLeft aria-hidden="true" className="size-4" />,
        )}
        {step(
          page + 1,
          "Następna strona",
          <ChevronRight aria-hidden="true" className="size-4" />,
        )}
      </nav>
    </div>
  );
}

export interface ClientTableProps {
  path: string;
  params: ClientTableParams;
  rows: ClientRow[];
  /** All clients matching (not only this page). */
  total: number;
}

export function ClientTable({ path, params, rows, total }: ClientTableProps) {
  const sort = (
    column: ClientSortColumn,
    label: string,
    className?: string,
  ) => (
    <SortHead className={className} column={column} params={params} path={path}>
      {label}
    </SortHead>
  );
  return (
    <div className="space-y-3">
      <VisitTableSearch
        label="Szukaj klientów"
        placeholder="Szukaj: imię, e-mail, telefon…"
      />
      <div className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[0.8125rem] leading-5 text-[var(--text)]">
            <caption className="sr-only">Klienci</caption>
            <thead>
              <tr>
                {sort("nazwisko", "Klient")}
                <th className={TH} scope="col">
                  Telefon
                </th>
                {sort("wizyty", "Wizyty")}
                {sort("ostatnia", "Ostatnia wizyta")}
                {sort("najblizsza", "Najbliższa wizyta")}
                {sort("zaplacono", "Zapłacono", "text-right")}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr
                    className="group hover:bg-[var(--surface-subtle)]"
                    key={row.id}
                  >
                    <td className={TD}>
                      <Link
                        className="font-semibold text-[var(--text)] hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                        href={row.href}
                      >
                        {row.name}
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {row.email}
                      </span>
                    </td>
                    <td className={cn(TD, "whitespace-nowrap")}>
                      {row.phone ?? "—"}
                    </td>
                    <td className={cn(TD, "whitespace-nowrap tabular-nums")}>
                      {row.visits}
                      {row.upcoming ? (
                        <span className="block text-xs text-[var(--info)]">
                          {row.upcoming}
                        </span>
                      ) : null}
                    </td>
                    <td className={cn(TD, "whitespace-nowrap tabular-nums")}>
                      {row.lastVisit}
                    </td>
                    <td className={cn(TD, "whitespace-nowrap tabular-nums")}>
                      {row.nextVisit}
                    </td>
                    <td
                      className={cn(
                        TD,
                        "text-right whitespace-nowrap tabular-nums",
                      )}
                    >
                      {row.paid}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-3 py-10 text-center text-sm text-[var(--text-muted)]"
                    colSpan={6}
                  >
                    {params.q
                      ? "Nikt nie pasuje do wyszukiwania."
                      : "Nie ma jeszcze klientów. Pojawią się tu po pierwszej rezerwacji."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        params={params}
        path={path}
        shown={rows.length}
        total={total}
      />
    </div>
  );
}
