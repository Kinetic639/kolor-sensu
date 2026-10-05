import { addDays, mondayOf, zonedInstant } from "@repo/scheduling";
import {
  createLoader,
  createParser,
  parseAsArrayOf,
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
  /** Visits with nothing left to do (a week after, settled). */
  "archiwum",
] as const;
/** Ranges back from today: when bookings were made or last changed. */
export const VISIT_PAST_SCOPES = [
  "dzis",
  "wczoraj",
  "ten-tydzien",
  "ostatnie-7-dni",
  "ten-miesiac",
  "ostatnie-30-dni",
] as const;
export const VISIT_SORTS = [
  "termin",
  "klient",
  "specjalista",
  "usluga",
  "miejsce",
  "kwota",
  "status",
  "utworzono",
  "zmiana",
] as const;
export const PAGE_SIZES = [10, 20, 50] as const;

export type VisitStatusFilter = (typeof VISIT_STATUS_FILTERS)[number];
export type VisitPaymentFilter = (typeof VISIT_PAYMENT_FILTERS)[number];
export type VisitScope = (typeof VISIT_SCOPES)[number];
export type VisitPastScope = (typeof VISIT_PAST_SCOPES)[number];
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
export const parseAsPlace = createParser({
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

/**
 * Several values at once (`a,b`), each checked by `one`; the invalid are
 * left out, none left is no filter.
 */
export function listOf<T extends string>(one: {
  parse: (v: string) => T | null;
  serialize: (v: T) => string;
}) {
  const list = parseAsArrayOf(
    createParser({ parse: one.parse, serialize: one.serialize }),
  );
  return createParser({
    parse: (value) => {
      const values = list.parse(value);
      return values?.length ? [...new Set(values)] : null;
    },
    serialize: (value: T[]) => list.serialize(value),
    eq: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
  });
}

/** Statuses, several at once; none valid is no filter. */
export const parseAsStatuses = listOf(
  parseAsStringLiteral(VISIT_STATUS_FILTERS),
);

export const visitTableParsers = {
  q: parseAsSearch,
  /** Several at once each: `status=potwierdzone,oczekujace`. */
  status: parseAsStatuses,
  platnosc: listOf(parseAsStringLiteral(VISIT_PAYMENT_FILTERS)),
  specjalista: listOf(parseAsId),
  usluga: listOf(parseAsId),
  /** Rooms and/or `online`. */
  miejsce: listOf(parseAsPlace),
  zakres: parseAsStringLiteral(VISIT_SCOPES).withDefault("nadchodzace"),
  /** A range of days of one's own (both ends included), over `zakres`. */
  od: parseAsDay,
  do: parseAsDay,
  /** When booked: a range back from today, or days of one's own. */
  utworzono: parseAsStringLiteral(VISIT_PAST_SCOPES),
  utworzono_od: parseAsDay,
  utworzono_do: parseAsDay,
  /** When last changed, the same way. */
  zmiana: parseAsStringLiteral(VISIT_PAST_SCOPES),
  zmiana_od: parseAsDay,
  zmiana_do: parseAsDay,
  sort: parseAsStringLiteral(VISIT_SORTS).withDefault("termin"),
  kierunek: parseAsStringLiteral(["rosnaco", "malejaco"] as const),
  strona: parseAsInteger.withDefault(1),
  wierszy: parseAsNumberLiteral(PAGE_SIZES).withDefault(20),
  /** The visit open in the side panel, and its tab. */
  wizyta: parseAsId,
  karta: parseAsStringLiteral([
    "szczegoly",
    "historia",
    "klient",
  ] as const).withDefault("szczegoly"),
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
    params.status?.length ||
    params.platnosc?.length ||
    params.specjalista?.length ||
    params.usluga?.length ||
    params.miejsce?.length ||
    params.od ||
    params.do ||
    params.utworzono ||
    params.utworzono_od ||
    params.utworzono_do ||
    params.zmiana ||
    params.zmiana_od ||
    params.zmiana_do ||
    params.zakres !== "nadchodzace",
  );
}

/** Past periods show the latest first unless asked otherwise. */
export function sortDirection(params: VisitTableParams): "asc" | "desc" {
  if (params.kierunek) return params.kierunek === "malejaco" ? "desc" : "asc";
  return (params.zakres === "minione" || params.zakres === "archiwum") &&
    params.sort === "termin" &&
    !params.od
    ? "desc"
    : "asc";
}

/**
 * A column header's link, three clicks round: sort by it (its usual way),
 * then the other way, then no more (the table's usual order, by date).
 */
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
  if (params.kierunek) {
    return visitTableHref(path, params, {
      sort: "termin",
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
  | "created"
  | "changed"
> = {
  termin: "starts_at",
  klient: "client",
  specjalista: "specialist",
  usluga: "service",
  miejsce: "place",
  kwota: "price",
  status: "status",
  utworzono: "created",
  zmiana: "changed",
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

/**
 * The instants a range back from today covers (from, before), or days of
 * one's own (both ends included), in the centre's days.
 */
export function pastPeriod(
  scope: VisitPastScope | null,
  own: { from: string | null; to: string | null },
  now: Date,
  timeZone: string,
): { from: string | null; to: string | null } {
  const day = (date: string) =>
    zonedInstant(date, "00:00", timeZone).toISOString();
  if (own.from || own.to) {
    return {
      from: own.from ? day(own.from) : null,
      to: own.to ? day(addDays(own.to, 1)) : null,
    };
  }
  const today = localToday(now, timeZone);
  const tomorrow = day(addDays(today, 1));
  switch (scope) {
    case "dzis":
      return { from: day(today), to: tomorrow };
    case "wczoraj":
      return { from: day(addDays(today, -1)), to: day(today) };
    case "ten-tydzien":
      return { from: day(mondayOf(today)), to: tomorrow };
    case "ostatnie-7-dni":
      return { from: day(addDays(today, -6)), to: tomorrow };
    case "ten-miesiac":
      return { from: day(`${today.slice(0, 7)}-01`), to: tomorrow };
    case "ostatnie-30-dni":
      return { from: day(addDays(today, -29)), to: tomorrow };
    default:
      return { from: null, to: null };
  }
}

/** The page asked for, as the search_bookings query (@repo/supabase). */
export function toVisitSearch(
  params: VisitTableParams,
  {
    now = new Date(),
    own = false,
    timeZone = "Europe/Warsaw",
    clientId = null,
  }: {
    now?: Date;
    own?: boolean;
    timeZone?: string;
    /** One client's visits (their card): all of them, the archive too. */
    clientId?: string | null;
  } = {},
) {
  const page = Math.max(1, params.strona);
  const places = params.miejsce ?? [];
  const rooms = places.filter((place) => place !== "online");
  const created = pastPeriod(
    params.utworzono,
    { from: params.utworzono_od, to: params.utworzono_do },
    now,
    timeZone,
  );
  const changed = pastPeriod(
    params.zmiana,
    { from: params.zmiana_od, to: params.zmiana_do },
    now,
    timeZone,
  );
  return {
    query: params.q,
    statuses: params.status?.length
      ? params.status.flatMap((status) => STATUSES[status])
      : null,
    payments:
      !own && params.platnosc?.length
        ? params.platnosc.map((payment) => PAYMENTS[payment])
        : null,
    specialistIds: own ? null : params.specjalista,
    serviceIds: params.usluga,
    roomIds: rooms.length ? rooms : null,
    online: places.includes("online") ? true : null,
    ...visitPeriod(params, now, timeZone),
    createdFrom: created.from,
    createdTo: created.to,
    changedFrom: changed.from,
    changedTo: changed.to,
    sort: SORT_COLUMNS[params.sort],
    descending: sortDirection(params) === "desc",
    limit: params.wierszy,
    offset: (page - 1) * params.wierszy,
    own,
    clientId,
    // The archive: only in its own view; the past and all leave it out
    // (a client's card shows everything).
    archived: clientId
      ? null
      : params.zakres === "archiwum"
        ? true
        : params.zakres === "minione" || params.zakres === "wszystkie"
          ? false
          : null,
  };
}

/**
 * The side panel's tabs, as links (the table stays as it is); "Klient" (the
 * centre's record of them) where the clients are seen (the admin's table).
 */
export function visitPanelTabs(
  path: string,
  params: VisitTableParams,
  { client = false }: { client?: boolean } = {},
) {
  return [
    { key: "szczegoly" as const, label: "Szczegóły" },
    { key: "historia" as const, label: "Historia" },
    ...(client ? [{ key: "klient" as const, label: "Klient" }] : []),
  ].map((tab) => ({
    ...tab,
    href: visitTableHref(path, params, { karta: tab.key }),
  }));
}

/** The table's address with the side panel closed. */
export function visitPanelCloseHref(path: string, params: VisitTableParams) {
  return visitTableHref(path, params, { wizyta: null, karta: "szczegoly" });
}
