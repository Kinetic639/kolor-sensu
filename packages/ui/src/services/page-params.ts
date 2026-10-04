import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

// A service's page (`/oferta/[id]`): its section (tab) lives in the URL,
// so each renders on the server, loads only what it shows and has an
// address.

export const SERVICE_PAGE_TABS = [
  "przeglad",
  "specjalisci",
  "tresc",
  "ustawienia",
] as const;

export type ServicePageTab = (typeof SERVICE_PAGE_TABS)[number];

export const SERVICE_PAGE_TAB_LABELS: Record<ServicePageTab, string> = {
  przeglad: "Przegląd",
  specjalisci: "Specjaliści i ceny",
  tresc: "Treść na stronie",
  ustawienia: "Ustawienia",
};

export const servicePageParsers = {
  zakladka: parseAsStringLiteral(SERVICE_PAGE_TABS).withDefault("przeglad"),
};

export type ServicePageParams = inferParserType<typeof servicePageParsers>;

export const loadServicePageParams = createLoader(servicePageParsers);

const serialize = createSerializer(servicePageParsers, {
  clearOnDefault: true,
});

/** The service's page with the given state; unset values are left out. */
export function servicePageHref(
  id: string,
  values: Partial<ServicePageParams> = {},
) {
  return serialize(`/oferta/${id}`, values);
}

/** The page's tabs, as links (`count`: e.g. the specialists). */
export function servicePageTabs(
  id: string,
  counts: Partial<Record<ServicePageTab, number>> = {},
) {
  return SERVICE_PAGE_TABS.map((key) => ({
    key,
    label: SERVICE_PAGE_TAB_LABELS[key],
    href: servicePageHref(id, { zakladka: key }),
    count: counts[key],
  }));
}
