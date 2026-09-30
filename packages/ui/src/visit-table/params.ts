import { addDays, mondayOf, zonedInstant } from "@repo/scheduling";
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
// search, a filter per column with a few values, dates, sorting, the page
// and the visit open in the side panel. Every value is checked here (the
// database checks again); links are built from the same parsers, so the
// page, its links and the browser's controls agree.

export const VISIT_STATUS_FILTERS = [
  "potwierdzone",
  "oczekujace",
  "odwolane",
] as const;
export const VISIT_PAYMENT_FILTERS = [
  "oplacone",
  "nieoplacone",
  "do-zwrotu",
  "zwrocone",
] as const;
export const VISIT_SCOPES = [
  "nadchodzace",
  "dzis",
  "jutro",
  "ten-tydzien",
  "nastepny-tydzien",
  "ten-miesiac",
  "minione",
  "wszystkie",
] as const;
export const VISIT_SORTS = [
  "termin",
  "klient",
  "specjalista",
  "usluga",
  "miejsce",
  "kwota",
  "status",
] as const;
export const PAGE_SIZES = [10, 20, 50] as const;

export type VisitStatusFilter = (typeof VISIT_STATUS_FILTERS)[number];
export type VisitPaymentFilter = (typeof VISIT_PAYMENT_FILTERS)[number];
export type VisitScope = (typeof VISIT_SCOPES)[number];
export type VisitSortColumn = (typeof VISIT_SORTS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Words typed in the search box, trimmed, at most 100 characters. */
export const parseAsSearch = createParser({
  parse: (value) => value.trim().slice(0, 100) || null,
  serialize: (value: string) => value,
});

export const parseAsId = createParser({
  parse: (value) => (UUID.test(value) ? value : null),
  serialize: (value: string) => value,
});

/** `online`, or a room's id. */
const parseAsPlace = createParser({
  parse: (value) => (value === "online" || UUID.test(value) ? value : null),
  serialize: (value: string) => value,
});

/** A real calendar day, `2026-10-01`. */
export const parseAsDay = createParser({
  parse: (value) => {
    if (!DATE.test(value)) return null;
    const day = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(day.getTime()) &&
      day.toISOString().slice(0, 10) === value
      ? value
      : null;
  },
  serialize: (value: string) => value,
});

export const visitTableParsers = {
  q: parseAsSearch,
  status: parseAsStringLiteral(VISIT_STATUS_FILTERS),
  platnosc: parseAsStringLiteral(VISIT_PAYMENT_FILTERS),
  specjalista: parseAsId,
  usluga: parseAsId,
  miejsce: parseAsPlace,
  zakres: parseAsStringLiteral(VISIT_SCOPES).withDefault("nadchodzace"),
  /** A range of days of one's own (both ends included), over `zakres`. */
  od: parseAsDay,
  do: parseAsDay,
  sort: parseAsStringLiteral(VISIT_SORTS).withDefault("termin"),
  kierunek: parseAsStringLiteral(["rosnaco", "malejaco"] as const),
  strona: parseAsInteger.withDefault(1),
  wierszy: parseAsNumberLiteral(PAGE_SIZES).withDefault(20),
  /** The visit open in the side panel, and its tab. */
  wizyta: parseAsId,
  karta: parseAsStringLiteral(["szczegoly", "historia"] as const).withDefault(
    "szczegoly",
  ),
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

/** A filter narrows the table (the side panel and the page do not). */
export function isFiltered(params: VisitTableParams) {
  return Boolean(
    params.q ||
    params.status ||
    params.platnosc ||
    params.specjalista ||
    params.usluga ||
    params.miejsce ||
    params.od ||
    params.do ||
    params.zakres !== "nadchodzace",
  );
}

/** Past periods show the latest first unless asked otherwise. */
export function sortDirection(params: VisitTableParams): "asc" | "desc" {
  if (params.kierunek) return params.kierunek === "malejaco" ? "desc" : "asc";
  return params.zakres === "minione" && params.sort === "termin" && !params.od
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
  | "starts_at"
  | "client"
  | "specialist"
  | "service"
  | "place"
  | "price"
  | "status"
> = {
  termin: "starts_at",
  klient: "client",
  specjalista: "specialist",
  usluga: "service",
  miejsce: "place",
  kwota: "price",
  status: "status",
};

const STATUSES: Record<
  VisitStatusFilter,
  ("confirmed" | "awaiting_payment" | "cancelled")[]
> = {
  potwierdzone: ["confirmed"],
  oczekujace: ["awaiting_payment"],
  odwolane: ["cancelled"],
};

const PAYMENTS: Record<
  VisitPaymentFilter,
  "paid" | "unpaid" | "refund_due" | "refunded"
> = {
  oplacone: "paid",
  nieoplacone: "unpaid",
  "do-zwrotu": "refund_due",
  zwrocone: "refunded",
};

/** Today where the centre is. */
function localToday(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/**
 * The instants a period covers (visits starting from `from`, before `to`):
 * days of one's own, or one of the ready ranges, in the centre's days.
 */
export function visitPeriod(
  params: Pick<VisitTableParams, "zakres" | "od" | "do">,
  now: Date,
  timeZone: string,
): { from: string | null; to: string | null } {
  const day = (date: string) =>
    zonedInstant(date, "00:00", timeZone).toISOString();
  if (params.od || params.do) {
    return {
      from: params.od ? day(params.od) : null,
      to: params.do ? day(addDays(params.do, 1)) : null,
    };
  }
  const today = localToday(now, timeZone);
  const span = (first: string, days: number) => ({
    from: day(first),
    to: day(addDays(first, days)),
  });
  switch (params.zakres) {
    case "nadchodzace":
      return { from: now.toISOString(), to: null };
    case "minione":
      return { from: null, to: now.toISOString() };
    case "dzis":
      return span(today, 1);
    case "jutro":
      return span(addDays(today, 1), 1);
    case "ten-tydzien":
      return span(mondayOf(today), 7);
    case "nastepny-tydzien":
      return span(addDays(mondayOf(today), 7), 7);
    case "ten-miesiac": {
      const first = `${today.slice(0, 7)}-01`;
      const next = new Date(`${first}T12:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      return { from: day(first), to: day(next.toISOString().slice(0, 10)) };
    }
    default:
      return { from: null, to: null };
  }
}

/** The page asked for, as the search_visits query (@repo/supabase). */
export function toVisitSearch(
  params: VisitTableParams,
  {
    now = new Date(),
    own = false,
    timeZone = "Europe/Warsaw",
  }: { now?: Date; own?: boolean; timeZone?: string } = {},
) {
  const page = Math.max(1, params.strona);
  const place = params.miejsce;
  return {
    query: params.q,
    statuses: params.status ? STATUSES[params.status] : null,
    payment: !own && params.platnosc ? PAYMENTS[params.platnosc] : null,
    specialistId: own ? null : params.specjalista,
    serviceId: params.usluga,
    roomId: place && place !== "online" ? place : null,
    online: place === "online" ? true : null,
    ...visitPeriod(params, now, timeZone),
    sort: SORT_COLUMNS[params.sort],
    descending: sortDirection(params) === "desc",
    limit: params.wierszy,
    offset: (page - 1) * params.wierszy,
    own,
  };
}

/** The side panel's tabs, as links (the table stays as it is). */
export function visitPanelTabs(path: string, params: VisitTableParams) {
  return [
    { key: "szczegoly" as const, label: "Szczegóły" },
    { key: "historia" as const, label: "Historia" },
  ].map((tab) => ({
    ...tab,
    href: visitTableHref(path, params, { karta: tab.key }),
  }));
}

/** The table's address with the side panel closed. */
export function visitPanelCloseHref(path: string, params: VisitTableParams) {
  return visitTableHref(path, params, { wizyta: null, karta: "szczegoly" });
}
