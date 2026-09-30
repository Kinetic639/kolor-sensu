import {
  createLoader,
  createParser,
  createSerializer,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

// The bookings table's state in the URL (docs/product/booking-plan.md, R9):
// search, filters, sorting and the page. Every value is checked here (the
// database checks again); links are built from the same parsers, so the
// page, its links and the search box agree.

export const VISIT_STATUS_FILTERS = [
  "potwierdzone",
  "oczekujace",
  "odwolane",
  "do-zwrotu",
] as const;
export const VISIT_SCOPES = ["nadchodzace", "minione", "wszystkie"] as const;
export const VISIT_SORTS = [
  "termin",
  "klient",
  "specjalista",
  "usluga",
  "kwota",
  "status",
] as const;
export const PAGE_SIZES = [10, 20, 50] as const;

export type VisitStatusFilter = (typeof VISIT_STATUS_FILTERS)[number];
export type VisitScope = (typeof VISIT_SCOPES)[number];
export type VisitSortColumn = (typeof VISIT_SORTS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Words typed in the search box, trimmed, at most 100 characters. */
export const parseAsSearch = createParser({
  parse: (value) => value.trim().slice(0, 100) || null,
  serialize: (value: string) => value,
});

const parseAsId = createParser({
  parse: (value) => (UUID.test(value) ? value : null),
  serialize: (value: string) => value,
});

export const visitTableParsers = {
  q: parseAsSearch,
  status: parseAsStringLiteral(VISIT_STATUS_FILTERS),
  specjalista: parseAsId,
  zakres: parseAsStringLiteral(VISIT_SCOPES).withDefault("nadchodzace"),
  sort: parseAsStringLiteral(VISIT_SORTS).withDefault("termin"),
  kierunek: parseAsStringLiteral(["rosnaco", "malejaco"] as const),
  strona: parseAsInteger.withDefault(1),
  wierszy: parseAsNumberLiteral(PAGE_SIZES).withDefault(20),
};

export type VisitTableParams = inferParserType<typeof visitTableParsers>;

export const loadVisitTableParams = createLoader(visitTableParsers);

const serialize = createSerializer(visitTableParsers, { clearOnDefault: true });

/** The table's address with some values changed (defaults left out). */
export function visitTableHref(
  path: string,
  params: VisitTableParams,
  patch: Partial<VisitTableParams>,
) {
  return serialize(path, { ...params, ...patch });
}

/** The direction shown: as asked, else the latest first for past visits. */
export function sortDirection(params: VisitTableParams): "asc" | "desc" {
  if (params.kierunek) return params.kierunek === "malejaco" ? "desc" : "asc";
  return params.zakres === "minione" && params.sort === "termin"
    ? "desc"
    : "asc";
}

/** A column header's link: sort by it, or turn the direction round. */
export function sortHref(
  path: string,
  params: VisitTableParams,
  column: VisitSortColumn,
) {
  if (params.sort !== column) {
    return visitTableHref(path, params, {
      sort: column,
      kierunek: null,
      strona: 1,
    });
  }
  return visitTableHref(path, params, {
    kierunek: sortDirection(params) === "asc" ? "malejaco" : "rosnaco",
    strona: 1,
  });
}

const SORT_COLUMNS: Record<
  VisitSortColumn,
  "starts_at" | "client" | "specialist" | "service" | "price" | "status"
> = {
  termin: "starts_at",
  klient: "client",
  specjalista: "specialist",
  usluga: "service",
  kwota: "price",
  status: "status",
};

const STATUSES: Record<
  VisitStatusFilter,
  ("confirmed" | "awaiting_payment" | "cancelled")[] | null
> = {
  potwierdzone: ["confirmed"],
  oczekujace: ["awaiting_payment"],
  odwolane: ["cancelled"],
  "do-zwrotu": null,
};

/** The page asked for, as the search_visits query (@repo/supabase). */
export function toVisitSearch(
  params: VisitTableParams,
  { now = new Date(), own = false }: { now?: Date; own?: boolean } = {},
) {
  const page = Math.max(1, params.strona);
  return {
    query: params.q,
    statuses: params.status ? STATUSES[params.status] : null,
    refundDue: params.status === "do-zwrotu",
    specialistId: own ? null : params.specjalista,
    from: params.zakres === "nadchodzace" ? now.toISOString() : null,
    to: params.zakres === "minione" ? now.toISOString() : null,
    sort: SORT_COLUMNS[params.sort],
    descending: sortDirection(params) === "desc",
    limit: params.wierszy,
    offset: (page - 1) * params.wierszy,
    own,
  };
}
