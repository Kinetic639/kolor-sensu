import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
} from "nuqs/server";

// CMS: one tab per page of the public site, in the URL, so each renders on
// the server, loads only what it shows and has an address. Each tab lists
// that page's sections, top to bottom, with their settings.

export const CMS_PAGES = ["glowna", "gabinety"] as const;

export type CmsPage = (typeof CMS_PAGES)[number];

const LABELS: Record<CmsPage, string> = {
  glowna: "Strona główna",
  gabinety: "Gabinety",
};

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
    label: LABELS[key],
    href: cmsHref(key),
  }));
}
