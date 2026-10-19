import { describe, expect, it } from "vitest";
import {
  defaultPageSeo,
  defaultSeoTitle,
  pageSeoContentSchema,
  resolvePageSeo,
  SEO_PAGES,
  seoContentKey,
} from "./cms-seo";

describe("a page's search and sharing settings", () => {
  it("reads empty settings as all the page's own", () => {
    expect(pageSeoContentSchema.parse({})).toEqual(defaultPageSeo);
  });

  it("trims the texts and refuses ones too long to store", () => {
    expect(pageSeoContentSchema.parse({ title: "  O nas  " }).title).toBe(
      "O nas",
    );
    expect(
      pageSeoContentSchema.safeParse({ title: "a".repeat(121) }).success,
    ).toBe(false);
    expect(
      pageSeoContentSchema.safeParse({ description: "a".repeat(321) }).success,
    ).toBe(false);
  });

  it("refuses fields it does not know", () => {
    expect(
      pageSeoContentSchema.safeParse({ keywords: "terapia" }).success,
    ).toBe(false);
  });

  it("asks for the picture's description when there is a picture", () => {
    const result = pageSeoContentSchema.safeParse({
      ogImagePath: "seo/a.jpg",
      ogImageAlt: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["ogImageAlt"]);
    expect(
      pageSeoContentSchema.safeParse({
        ogImagePath: "seo/a.jpg",
        ogImageAlt: "Gabinet z fotelem",
      }).success,
    ).toBe(true);
  });
});

describe("the pages", () => {
  it("each has its own key, address and defaults", () => {
    const keys = SEO_PAGES.map((one) => seoContentKey(one.page));
    expect(new Set(keys).size).toBe(SEO_PAGES.length);
    expect(new Set(SEO_PAGES.map((one) => one.path)).size).toBe(
      SEO_PAGES.length,
    );
    expect(keys).toContain("seo_home");
    for (const one of SEO_PAGES) {
      expect(one.path.startsWith("/")).toBe(true);
      expect(one.description.length).toBeGreaterThan(0);
    }
  });

  it("titles the homepage whole and the others with the site's name", () => {
    expect(defaultSeoTitle("home")).toBe(
      "Kolor Sensu | Centrum psychoterapii i rozwoju",
    );
    expect(defaultSeoTitle("about")).toBe("O nas | Kolor Sensu");
  });
});

describe("resolving what the site shows", () => {
  it("falls back to the page's own title and description", () => {
    expect(resolvePageSeo("contact", null)).toEqual({
      path: "/kontakt",
      title: "Kontakt | Kolor Sensu",
      description:
        "Adres, telefon, e-mail i godziny otwarcia Kolor Sensu. Zadzwoń lub napisz, a pomożemy dobrać specjalistę i termin.",
      ogTitle: "Kontakt | Kolor Sensu",
      ogDescription:
        "Adres, telefon, e-mail i godziny otwarcia Kolor Sensu. Zadzwoń lub napisz, a pomożemy dobrać specjalistę i termin.",
      ogImagePath: null,
      ogImageAlt: "",
      noindex: false,
    });
  });

  it("shares the search title and description unless given their own", () => {
    const seo = resolvePageSeo("about", {
      ...defaultPageSeo,
      title: "Kim jesteśmy · Kolor Sensu",
      description: "Zespół terapeutów z Poznania.",
    });
    expect(seo.ogTitle).toBe("Kim jesteśmy · Kolor Sensu");
    expect(seo.ogDescription).toBe("Zespół terapeutów z Poznania.");

    const shared = resolvePageSeo("about", {
      ...defaultPageSeo,
      ogTitle: "Poznaj nas",
      ogDescription: "Zajrzyj do nas.",
      ogImagePath: "seo/a.jpg",
      ogImageAlt: "Gabinet",
      noindex: true,
    });
    expect(shared).toMatchObject({
      title: "O nas | Kolor Sensu",
      ogTitle: "Poznaj nas",
      ogDescription: "Zajrzyj do nas.",
      ogImagePath: "seo/a.jpg",
      ogImageAlt: "Gabinet",
      noindex: true,
    });
  });
});
