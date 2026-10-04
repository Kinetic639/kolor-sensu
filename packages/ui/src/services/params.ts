import type { NowStatus } from "@repo/scheduling";
import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { parseAsOpenRows } from "../resource-roster/open-rows";
import type { RosterSegment } from "../resource-roster/roster-bar";
import { matchesSearch } from "../resource-roster/search";
import type { SortOption } from "../resource-roster/sort-menu";
import { rosterWeekNav } from "../resource-roster/week-nav";
import { parseAsDay, parseAsSearch } from "../visit-table/params";
import type { ServiceOffer, ServiceRow } from "./types";

// The offer's roster in the URL: the search, which services (a segment),
// the order, the week shown and the rows open (with their tab). A centre
// has a few services, so the server reads them all and filters here; and
// what a service's row says (where it is seen, what keeps clients from
// it, its prices) is worked out here too.

export const SERVICE_SEGMENTS = [
  "na-stronie",
  "ukryte",
  "do-uwagi",
  "nieaktywne",
] as const;

export const SERVICE_SORTS = ["kolejnosc", "nazwa", "cena", "wizyty"] as const;

export type ServiceSort = (typeof SERVICE_SORTS)[number];

export const serviceListParsers = {
  q: parseAsSearch,
  stan: parseAsStringLiteral(SERVICE_SEGMENTS),
  sort: parseAsStringLiteral(SERVICE_SORTS).withDefault("kolejnosc"),
  tydzien: parseAsDay,
  otwarte: parseAsOpenRows,
};

export type ServiceListParams = inferParserType<typeof serviceListParsers>;

export const loadServiceListParams = createLoader(serviceListParsers);

const serialize = createSerializer(serviceListParsers, {
  clearOnDefault: true,
});

export function serviceListHref(
  path: string,
  params: ServiceListParams,
  patch: Partial<ServiceListParams>,
) {
  return serialize(path, { ...params, ...patch });
}

type Shown = Pick<
  ServiceRow,
  "active" | "publiclyVisible" | "bookingEnabled" | "offers"
>;

const leading = (offers: ServiceOffer[]) =>
  offers.filter((offer) => offer.active);

const AWAY = "Nie ma jej na stronie, w menu ani w rezerwacji";

/**
 * Whether the service is on and seen on the site, with a dot as the
 * team's "now"; under it, how clients get to it, or what keeps them away
 * (nobody leads it). A hidden service is not bookable either.
 */
export function serviceStatus(service: Shown): NowStatus {
  if (!service.active) {
    return { tone: "off", title: "Nieaktywna", detail: AWAY };
  }
  if (!service.publiclyVisible) {
    return {
      tone: "later",
      title: "Aktywna · ukryta na stronie",
      detail: AWAY,
    };
  }
  const title = "Aktywna · na stronie";
  if (!leading(service.offers).length) {
    return {
      tone: "warn",
      title,
      detail: "Nikt jej nie prowadzi · nie da się zarezerwować",
    };
  }
  return {
    tone: "free",
    title,
    detail: service.bookingEnabled
      ? "Z rezerwacją online"
      : "Bez rezerwacji online",
  };
}

const zloty = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

/** The active offers' prices: `200–220 zł`, `180 zł`; none: null. */
export function priceRange(offers: ServiceOffer[]) {
  const prices = leading(offers).map((offer) => offer.priceMinor);
  if (!prices.length) return null;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high
    ? `${zloty.format(low / 100)} zł`
    : `${zloty.format(low / 100)}–${zloty.format(high / 100)} zł`;
}

/** The price as the service's page on the site says it: `od 200 zł`. */
export function sitePrice(offers: ServiceOffer[]) {
  const prices = leading(offers).map((offer) => offer.priceMinor);
  if (!prices.length) return null;
  const low = Math.min(...prices);
  const label = `${zloty.format(low / 100)} zł`;
  return prices.every((price) => price === low) ? label : `od ${label}`;
}

/** The times the active offers take (`50 / 60 min`), else the service's. */
export function durationsLabel(
  service: Pick<ServiceRow, "offers" | "durationMinutes">,
) {
  const minutes = [
    ...new Set(leading(service.offers).map((offer) => offer.durationMinutes)),
  ].sort((a, b) => a - b);
  return `${(minutes.length ? minutes : [service.durationMinutes]).join(" / ")} min`;
}

export interface ReadinessItem {
  key: "opis" | "prowadzi" | "aktywna" | "widoczna";
  ok: boolean;
  title: string;
  detail: string;
}

/** What the site and the booking need of it, each checked. */
export function serviceReadiness(
  service: Shown & Pick<ServiceRow, "shortDescription">,
): ReadinessItem[] {
  const leaders = leading(service.offers);
  return [
    {
      key: "aktywna",
      ok: service.active,
      title: "Usługa aktywna",
      detail: service.active
        ? "Włączona w ustawieniach"
        : "Włącz ją w Ustawieniach",
    },
    {
      key: "widoczna",
      ok: service.publiclyVisible,
      title: "Widoczna na stronie",
      detail: service.publiclyVisible
        ? "W menu Oferta i pod własnym adresem"
        : "Bez strony i bez miejsca w menu",
    },
    {
      key: "prowadzi",
      ok: leaders.length > 0,
      title: "Ktoś ją prowadzi",
      detail: leaders.length
        ? `${leaders.length} ${leaders.length === 1 ? "aktywna oferta" : "aktywne oferty"}`
        : "Bez ofert usługi nie da się zarezerwować",
    },
    {
      key: "opis",
      ok: Boolean(service.shortDescription),
      title: "Krótki opis na kafelku",
      detail: service.shortDescription
        ? `„${service.shortDescription}”`
        : "Kafelek pokaże samą nazwę",
    },
  ];
}

const IN_SEGMENT: Record<
  (typeof SERVICE_SEGMENTS)[number],
  (service: ServiceRow) => boolean
> = {
  "na-stronie": (service) => service.active && service.publiclyVisible,
  ukryte: (service) => service.active && !service.publiclyVisible,
  "do-uwagi": (service) => serviceStatus(service).tone === "warn",
  nieaktywne: (service) => !service.active,
};

const SEGMENT_LABELS: Record<(typeof SERVICE_SEGMENTS)[number], string> = {
  "na-stronie": "Na stronie",
  ukryte: "Ukryte na stronie",
  "do-uwagi": "Do uwagi",
  nieaktywne: "Nieaktywne",
};

const collator = new Intl.Collator("pl");
const byName = (a: ServiceRow, b: ServiceRow) =>
  collator.compare(a.name, b.name);
const lowestPrice = (service: ServiceRow) => {
  const prices = leading(service.offers).map((offer) => offer.priceMinor);
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
};

const ORDER: Record<ServiceSort, (a: ServiceRow, b: ServiceRow) => number> = {
  kolejnosc: (a, b) => a.order - b.order,
  nazwa: byName,
  cena: (a, b) => {
    const [x, y] = [lowestPrice(a), lowestPrice(b)];
    return x === y ? 0 : x < y ? -1 : 1;
  },
  wizyty: (a, b) => b.visitCount - a.visitCount,
};

/** The services the address asks for: searched, in the segment, in order. */
export function shownServices(rows: ServiceRow[], params: ServiceListParams) {
  const matches = matchesSearch(params.q);
  const segment = params.stan ? IN_SEGMENT[params.stan] : null;
  return rows
    .filter((service) =>
      matches(`${service.name} ${service.slug} ${service.catalog?.name ?? ""}`),
    )
    .filter((service) => !segment || segment(service))
    .sort((a, b) => ORDER[params.sort](a, b) || byName(a, b));
}

/** "Wszystkie" and the segments with any service in them (or chosen). */
export function serviceSegments(
  path: string,
  params: ServiceListParams,
  rows: ServiceRow[],
): RosterSegment[] {
  return [
    {
      key: "wszystkie",
      label: "Wszystkie",
      count: rows.length,
      href: serviceListHref(path, params, { stan: null }),
      active: !params.stan,
    },
    ...SERVICE_SEGMENTS.flatMap((key) => {
      const count = rows.filter(IN_SEGMENT[key]).length;
      const active = params.stan === key;
      return count || active
        ? [
            {
              key,
              label: SEGMENT_LABELS[key],
              count,
              href: serviceListHref(path, params, { stan: key }),
              active,
            },
          ]
        : [];
    }),
  ];
}

const SORT_LABELS: Record<ServiceSort, string> = {
  kolejnosc: "Kolejność na stronie",
  nazwa: "Nazwa",
  cena: "Cena",
  wizyty: "Wizyty w tygodniu",
};

export function serviceSortOptions(
  path: string,
  params: ServiceListParams,
): SortOption[] {
  return SERVICE_SORTS.map((key) => ({
    key,
    label: SORT_LABELS[key],
    href: serviceListHref(path, params, { sort: key }),
    active: params.sort === key,
  }));
}

/** The week shown and its neighbours; this week has no date. */
export function serviceWeekNav(
  path: string,
  params: ServiceListParams,
  weeks: { week: string; thisWeek: string },
) {
  return rosterWeekNav(
    (tydzien) => serviceListHref(path, params, { tydzien }),
    weeks,
  );
}

const plural = (count: number, one: string, few: string, many: string) => {
  if (count === 1) return `1 ${one}`;
  const tens = count % 100;
  const ones = count % 10;
  return `${count} ${ones >= 2 && ones <= 4 && (tens < 12 || tens > 14) ? few : many}`;
};

/** `5 usług · 7 ofert specjalistów · 15 wizyt w tygodniu` */
export function servicesWeekSummary(rows: ServiceRow[]) {
  const offers = rows.reduce(
    (sum, service) => sum + leading(service.offers).length,
    0,
  );
  const visits = rows.reduce((sum, service) => sum + service.visitCount, 0);
  return [
    plural(rows.length, "usługa", "usługi", "usług"),
    `${plural(offers, "oferta", "oferty", "ofert")} specjalistów`,
    `${plural(visits, "wizyta", "wizyty", "wizyt")} w tygodniu`,
  ].join(" · ");
}
