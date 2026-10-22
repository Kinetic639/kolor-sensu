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

let articles: { slug: string; categoryId: string; contentUpdatedAt: string }[] =
  [];
let ebooks: { slug: string; contentUpdatedAt: string }[] = [];
vi.mock("@/lib/education-data", () => ({
  getArticles: async () => articles,
  getEbooks: async () => ebooks,
  getArticleCategories: async () => [
    { id: "c1", slug: "dzieci", name: "Dzieci", description: "", sortOrder: 0 },
    { id: "c2", slug: "pusta", name: "Pusta", description: "", sortOrder: 1 },
  ],
}));

let issues: { number: number; sendAt: string }[] = [];
vi.mock("@/lib/newsletter-data", () => ({
  getNewsletterArchive: async () => issues,
}));

const { default: sitemap } = await import("./sitemap");

beforeEach(() => {
  hidden = new Set();
  articles = [];
  ebooks = [];
  issues = [];
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

  it("lists the articles, with their dates, and the categories in use", async () => {
    expect(await urls()).not.toContain(`${siteUrl}/edukacja/artykuly`);
    articles = [
      {
        slug: "lek-u-dzieci",
        categoryId: "c1",
        contentUpdatedAt: "2026-10-21T10:00:00Z",
      },
    ];
    const entries = await sitemap();
    const listed = entries.map((entry) => entry.url);
    expect(listed).toEqual(
      expect.arrayContaining([
        `${siteUrl}/edukacja/artykuly`,
        `${siteUrl}/edukacja/artykuly/kategoria/dzieci`,
      ]),
    );
    expect(listed).not.toContain(
      `${siteUrl}/edukacja/artykuly/kategoria/pusta`,
    );
    expect(
      entries.find((entry) => entry.url.endsWith("/lek-u-dzieci"))
        ?.lastModified,
    ).toBe("2026-10-21T10:00:00Z");
  });

  it("lists the e-books once there are any", async () => {
    expect(await urls()).not.toContain(`${siteUrl}/edukacja/ebooki`);
    ebooks = [
      { slug: "spokojny-sen", contentUpdatedAt: "2026-10-21T10:00:00Z" },
    ];
    expect(await urls()).toEqual(
      expect.arrayContaining([
        `${siteUrl}/edukacja/ebooki`,
        `${siteUrl}/edukacja/ebooki/spokojny-sen`,
      ]),
    );
  });

  it("lists the newsletter's archive once an issue is in it", async () => {
    expect(await urls()).not.toContain(`${siteUrl}/newsletter`);
    issues = [{ number: 1, sendAt: "2026-10-22T08:00:00Z" }];
    expect(await urls()).toEqual(
      expect.arrayContaining([
        `${siteUrl}/newsletter`,
        `${siteUrl}/newsletter/1`,
      ]),
    );
  });
});
