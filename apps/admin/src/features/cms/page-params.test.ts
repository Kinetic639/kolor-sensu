import { describe, expect, it } from "vitest";
import { cmsHref, cmsTabs, loadCmsParams } from "./page-params";

describe("CMS page tabs", () => {
  it("has one tab per page of the site, the homepage first", () => {
    expect(cmsTabs()).toEqual([
      { key: "glowna", label: "Strona główna", href: "/cms" },
      { key: "gabinety", label: "Gabinety", href: "/cms?strona=gabinety" },
    ]);
  });

  it("reads the page from the address, the homepage by default", () => {
    expect(loadCmsParams({ strona: "gabinety" }).strona).toBe("gabinety");
    expect(loadCmsParams({}).strona).toBe("glowna");
    expect(loadCmsParams({ strona: "nic" }).strona).toBe("glowna");
    expect(cmsHref("glowna")).toBe("/cms");
  });
});
