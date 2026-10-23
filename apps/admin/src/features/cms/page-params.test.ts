import { SEO_PAGES } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  CMS_PAGE_SEO,
  CMS_PAGES,
  cmsHref,
  cmsTabs,
  loadCmsParams,
} from "./page-params";

describe("CMS page tabs", () => {
  it("has one tab per page of the site, the homepage first, then the shared settings", () => {
    const tabs = cmsTabs();
    expect(tabs[0]).toEqual({
      key: "glowna",
      label: "Strona główna",
      href: "/cms",
    });
    expect(tabs).toContainEqual({
      key: "gabinety",
      label: "Gabinety",
      href: "/cms?strona=gabinety",
    });
    expect(tabs.map((tab) => tab.label)).toEqual([
      "Strona główna",
      "O nas",
      "Oferta",
      "Specjaliści",
      "Cennik",
      "Gabinety",
      "Warsztaty",
      "Edukacja",
      "Kontakt",
      "Umów wizytę",
      "Pomoc w kryzysie",
      "Polityka prywatności",
      "Regulamin",
      "Pliki cookies",
      "Ustawienia wspólne",
    ]);
    expect(tabs.at(-1)).toEqual({
      key: "wspolne",
      label: "Ustawienia wspólne",
      href: "/cms?strona=wspolne",
    });
  });

  it("gives every page of the search settings its tab, once", () => {
    const pages = CMS_PAGES.map((page) => CMS_PAGE_SEO[page]);
    expect(new Set(pages).size).toBe(SEO_PAGES.length);
    expect([...pages].sort()).toEqual(SEO_PAGES.map((one) => one.page).sort());
  });

  it("reads the page from the address, the homepage by default", () => {
    expect(loadCmsParams({ strona: "gabinety" }).strona).toBe("gabinety");
    expect(loadCmsParams({}).strona).toBe("glowna");
    expect(loadCmsParams({ strona: "nic" }).strona).toBe("glowna");
    expect(loadCmsParams({ strona: "o-nas" }).strona).toBe("o-nas");
    expect(loadCmsParams({ strona: "wspolne" }).strona).toBe("wspolne");
    expect(cmsHref("glowna")).toBe("/cms");
  });
});
