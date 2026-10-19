import { isSafePreviewPath } from "@repo/app-runtime/cms-preview";
import { describe, expect, it } from "vitest";
import { CMS_PAGES } from "./page-params";
import {
  CMS_PAGE_SITE_PATHS,
  cmsPreviewHref,
  parseCmsPreviewPage,
} from "./preview";

describe("CMS preview", () => {
  it("knows every CMS page's place on the site", () => {
    for (const page of CMS_PAGES) {
      expect(isSafePreviewPath(CMS_PAGE_SITE_PATHS[page])).toBe(true);
    }
    expect(CMS_PAGE_SITE_PATHS.glowna).toBe("/");
    expect(CMS_PAGE_SITE_PATHS.gabinety).toBe("/gabinety");
  });

  it("opens through the portal's /podglad", () => {
    expect(cmsPreviewHref("gabinety")).toBe("/podglad?strona=gabinety");
  });

  it("reads only the CMS's pages from the address", () => {
    expect(parseCmsPreviewPage("glowna")).toBe("glowna");
    expect(parseCmsPreviewPage("nic")).toBeNull();
    expect(parseCmsPreviewPage(null)).toBeNull();
  });
});
