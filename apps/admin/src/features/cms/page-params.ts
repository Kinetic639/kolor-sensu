import { SEO_PAGES, type SeoPage } from "@repo/contracts";
import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
} from "nuqs/server";

// CMS: one tab per page of the public site, in the URL, so each renders on
// the server, loads only what it shows and has an address. Each tab lists
// that page's sections, top to bottom, with their settings; every page has
// its search and sharing settings ("Wyszukiwarka i udostępnianie").

export const CMS_PAGES = [
  "glowna",
  "o-nas",
  "oferta",
  "specjalisci",
  "cennik",
  "gabinety",
  "warsztaty",
  "edukacja",
  "kontakt",
  "umow-wizyte",
  "pomoc-w-kryzysie",
  "polityka-prywatnosci",
  "regulamin",
  "cookies",
] as const;

export type CmsPage = (typeof CMS_PAGES)[number];

/** Each tab's page, as the search settings know it (@repo/contracts/cms-seo). */
export const CMS_PAGE_SEO: Record<CmsPage, SeoPage> = {
  glowna: "home",
  "o-nas": "about",
  oferta: "offer",
  specjalisci: "specialists",
  cennik: "prices",
  gabinety: "rooms",
  warsztaty: "workshops",
  edukacja: "education",
  kontakt: "contact",
  "umow-wizyte": "booking",
  "pomoc-w-kryzysie": "crisis_help",
  "polityka-prywatnosci": "privacy",
  regulamin: "terms",
  cookies: "cookies",
};

function label(page: CmsPage) {
  const seo = SEO_PAGES.find((one) => one.page === CMS_PAGE_SEO[page]);
  return seo?.label ?? page;
}

const cmsParsers = {
  strona: parseAsStringLiteral(CMS_PAGES).withDefault("glowna"),
};

export const loadCmsParams = createLoader(cmsParsers);

const serialize = createSerializer(cmsParsers, { clearOnDefault: true });

export function cmsHref(strona: CmsPage) {
  return serialize("/cms", { strona });
}

/** The pages as tabs (links). */
export function cmsTabs() {
  return CMS_PAGES.map((key) => ({
    key,
    label: label(key),
    href: cmsHref(key),
  }));
}
