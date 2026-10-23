import { SEO_PAGES } from "@repo/contracts";
import { CMS_PAGE_SEO, CMS_TABS, isCmsPage, type CmsTab } from "./page-params";

// "Podgląd": each CMS page opens its page of the site in a new tab, in the
// site's preview, which shows the saved drafts (docs/architecture/
// cms-domain.md, "Preview on the site"). The portal's /podglad signs the
// short-lived token on the click and sends the tab on to the site. The
// shared settings open on the homepage, which shows them.

function sitePath(page: CmsTab): string {
  if (!isCmsPage(page)) return "/";
  const seo = SEO_PAGES.find((one) => one.page === CMS_PAGE_SEO[page]);
  if (!seo) throw new Error(`No site path for the CMS page ${page}`);
  return seo.path;
}

/** Where each CMS page is on the site (its search settings' path). */
export const CMS_PAGE_SITE_PATHS = Object.fromEntries(
  CMS_TABS.map((page) => [page, sitePath(page)]),
) as Record<CmsTab, string>;

/** The portal's address that opens `page`'s preview. */
export function cmsPreviewHref(page: CmsTab): string {
  return `/podglad?strona=${page}`;
}

/** The CMS page named in the address, or null for anything else. */
export function parseCmsPreviewPage(value: string | null): CmsTab | null {
  return CMS_TABS.find((page) => page === value) ?? null;
}
