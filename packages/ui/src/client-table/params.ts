import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { parseAsSearch, PAGE_SIZES } from "../visit-table/params";

// The clients list's state in the URL (docs/product/booking-plan.md, R15):
// search, sorting and the page. Every value is checked here (the database
// checks again); links are built from the same parsers.

export const CLIENT_SORTS = [
  "ostatnia",
  "najblizsza",
  "nazwisko",
  "wizyty",
  "zaplacono",
  "dodany",
] as const;

export type ClientSortColumn = (typeof CLIENT_SORTS)[number];

export const clientTableParsers = {
  q: parseAsSearch,
  sort: parseAsStringLiteral(CLIENT_SORTS).withDefault("ostatnia"),
  kierunek: parseAsStringLiteral(["rosnaco", "malejaco"] as const),
  strona: parseAsInteger.withDefault(1),
  wierszy: parseAsNumberLiteral(PAGE_SIZES).withDefault(20),
};

export type ClientTableParams = inferParserType<typeof clientTableParsers>;

export const loadClientTableParams = createLoader(clientTableParsers);

const serialize = createSerializer(clientTableParsers, {
  clearOnDefault: true,
});

export function clientTableHref(
  path: string,
  params: ClientTableParams,
  patch: Partial<ClientTableParams>,
) {
  return serialize(path, { ...params, ...patch });
}

/** Names A–Z and the next visit soonest first; the rest largest or latest first. */
export function clientSortDirection(params: ClientTableParams): "asc" | "desc" {
  if (params.kierunek) return params.kierunek === "malejaco" ? "desc" : "asc";
  return params.sort === "nazwisko" || params.sort === "najblizsza"
    ? "asc"
    : "desc";
}

/** A column header's link: sort by it, or turn the direction round. */
export function clientSortHref(
  path: string,
  params: ClientTableParams,
  column: ClientSortColumn,
) {
  if (params.sort !== column) {
    return clientTableHref(path, params, {
      sort: column,
      kierunek: null,
      strona: 1,
    });
  }
  return clientTableHref(path, params, {
    kierunek: clientSortDirection(params) === "asc" ? "malejaco" : "rosnaco",
    strona: 1,
  });
}

const SORT_COLUMNS: Record<
  ClientSortColumn,
  "last_visit" | "next_visit" | "name" | "visits" | "paid" | "created"
> = {
  ostatnia: "last_visit",
  najblizsza: "next_visit",
  nazwisko: "name",
  wizyty: "visits",
  zaplacono: "paid",
  dodany: "created",
};

/** The page asked for, as the search_clients query (@repo/supabase). */
export function toClientSearch(params: ClientTableParams) {
  const page = Math.max(1, params.strona);
  return {
    query: params.q,
    sort: SORT_COLUMNS[params.sort],
    descending: clientSortDirection(params) === "desc",
    limit: params.wierszy,
    offset: (page - 1) * params.wierszy,
  };
}
