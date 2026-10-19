import { defaultPageSeo, type SeoPage } from "@repo/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "@/content/site";

// The sitemap: every public page, but those the CMS keeps out of search
// engines.

let hidden = new Set<SeoPage>();
vi.mock("@/lib/public-data", () => ({
  getServices: async () => [],
  getSpecialists: async () => [],
  getPageSeo: async (page: SeoPage) => ({
    ...defaultPageSeo,
    noindex: hidden.has(page),
    ogImageUrl: null,
  }),
}));

const { default: sitemap } = await import("./sitemap");

beforeEach(() => {
  hidden = new Set();
});

const urls = async () => (await sitemap()).map((entry) => entry.url);

describe("the sitemap", () => {
  it("lists every static page", async () => {
    expect(await urls()).toEqual(
      expect.arrayContaining([
        `${siteUrl}/`,
        `${siteUrl}/o-nas`,
        `${siteUrl}/kontakt`,
        `${siteUrl}/cookies`,
      ]),
    );
  });

  it("leaves out the pages kept out of search engines", async () => {
    hidden = new Set(["cookies", "home"]);
    const listed = await urls();
    expect(listed).not.toContain(`${siteUrl}/cookies`);
    expect(listed).not.toContain(`${siteUrl}/`);
    expect(listed).toContain(`${siteUrl}/o-nas`);
  });
});
