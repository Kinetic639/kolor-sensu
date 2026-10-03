import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import {
  listOf,
  PAGE_SIZES,
  parseAsDay,
  parseAsId,
  parseAsSearch,
  pastPeriod,
  VISIT_PAST_SCOPES,
} from "../visit-table/params";

// The clients list's state in the URL (docs/product/booking-plan.md, R15):
// the search, the filters (a visit to come or not, when the last visit
// was, since when a client), sorting, the page and the client open in the
// side panel with its tab. Every value is checked here (the database
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

export const CLIENT_UPCOMING = ["jest", "brak"] as const;

export const clientTableParsers = {
  q: parseAsSearch,
  /** A visit to come: `jest`, `brak` (both: either). */
  nadchodzaca: listOf(parseAsStringLiteral(CLIENT_UPCOMING)),
  /** The last visit: a range back from today, or days of one's own. */
  ostatnia: parseAsStringLiteral(VISIT_PAST_SCOPES),
  ostatnia_od: parseAsDay,
  ostatnia_do: parseAsDay,
  /** A client since, the same way. */
  dodany: parseAsStringLiteral(VISIT_PAST_SCOPES),
  dodany_od: parseAsDay,
  dodany_do: parseAsDay,
  sort: parseAsStringLiteral(CLIENT_SORTS).withDefault("ostatnia"),
  kierunek: parseAsStringLiteral(["rosnaco", "malejaco"] as const),
  strona: parseAsInteger.withDefault(1),
  wierszy: parseAsNumberLiteral(PAGE_SIZES).withDefault(20),
  /** The client open in the side panel, and its tab. */
  klient: parseAsId,
  karta: parseAsStringLiteral(["szczegoly", "wizyty"] as const).withDefault(
    "szczegoly",
  ),
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

/**
 * A column header's link, three clicks round: sort by it (its usual way),
 * then the other way, then no more (the list's usual order).
 */
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
  if (params.kierunek) {
    return clientTableHref(path, params, {
      sort: "ostatnia",
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

/** The side panel's tabs, as links (the list stays as it is). */
export function clientPanelTabs(path: string, params: ClientTableParams) {
  return [
    { key: "szczegoly" as const, label: "Szczegóły" },
    { key: "wizyty" as const, label: "Wizyty" },
  ].map((tab) => ({
    ...tab,
    href: clientTableHref(path, params, { karta: tab.key }),
  }));
}

/** The list's address with the side panel closed. */
export function clientPanelCloseHref(path: string, params: ClientTableParams) {
  return clientTableHref(path, params, { klient: null, karta: "szczegoly" });
}

/** The page asked for, as the search_clients query (@repo/supabase). */
export function toClientSearch(
  params: ClientTableParams,
  {
    now = new Date(),
    timeZone = "Europe/Warsaw",
  }: { now?: Date; timeZone?: string } = {},
) {
  const page = Math.max(1, params.strona);
  const upcoming = params.nadchodzaca ?? [];
  const last = pastPeriod(
    params.ostatnia,
    { from: params.ostatnia_od, to: params.ostatnia_do },
    now,
    timeZone,
  );
  const created = pastPeriod(
    params.dodany,
    { from: params.dodany_od, to: params.dodany_do },
    now,
    timeZone,
  );
  return {
    query: params.q,
    upcoming: upcoming.length === 1 ? upcoming[0] === "jest" : null,
    lastFrom: last.from,
    lastTo: last.to,
    createdFrom: created.from,
    createdTo: created.to,
    sort: SORT_COLUMNS[params.sort],
    descending: clientSortDirection(params) === "desc",
    limit: params.wierszy,
    offset: (page - 1) * params.wierszy,
  };
}
