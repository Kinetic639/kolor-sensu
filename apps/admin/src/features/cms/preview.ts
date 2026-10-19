import { CMS_PAGES, type CmsPage } from "./page-params";

// "Podgląd": each CMS page opens its page of the site in a new tab, in the
// site's preview, which shows the saved drafts (docs/architecture/
// cms-domain.md, "Preview on the site"). The portal's /podglad signs the
// short-lived token on the click and sends the tab on to the site.

/** Where each CMS page is on the site. */
export const CMS_PAGE_SITE_PATHS: Record<CmsPage, string> = {
  glowna: "/",
  gabinety: "/gabinety",
};

/** The portal's address that opens `page`'s preview. */
export function cmsPreviewHref(page: CmsPage): string {
  return `/podglad?strona=${page}`;
}

/** The CMS page named in the address, or null for anything else. */
export function parseCmsPreviewPage(value: string | null): CmsPage | null {
  return CMS_PAGES.find((page) => page === value) ?? null;
}
