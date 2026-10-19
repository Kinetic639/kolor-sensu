import {
  defaultPageSeo,
  defaultSeoTitle,
  SEO_SITE_NAME,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import { siteDescription, siteName, siteTagline } from "@/content/site";
import type { PageSeo } from "@/lib/public-data";
import { pageMetadata, seoMetadata } from "./page-metadata";

// A static page's metadata: the CMS's settings over the page's own.

let published: PageSeo = { ...defaultPageSeo, ogImageUrl: null };
vi.mock("@/lib/public-data", () => ({
  getPageSeo: async () => published,
}));

const none: PageSeo = { ...defaultPageSeo, ogImageUrl: null };

describe("with nothing set in the CMS", () => {
  it("keeps the page's own title, description and address", () => {
    expect(seoMetadata("about", none)).toEqual({
      title: { absolute: "O nas | Kolor Sensu" },
      description:
        "Kolor Sensu to zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.",
      alternates: { canonical: "/o-nas" },
      openGraph: {
        type: "website",
        locale: "pl_PL",
        siteName: "Kolor Sensu",
        title: "O nas | Kolor Sensu",
        description:
          "Kolor Sensu to zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.",
        url: "/o-nas",
      },
    });
  });

  it("leaves the picture to the page's generated one", () => {
    const metadata = seoMetadata("home", none);
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata).not.toHaveProperty("robots");
  });

  it("titles the homepage as the layout did", () => {
    expect(defaultSeoTitle("home")).toBe(`${siteName} | ${siteTagline}`);
    expect(SEO_SITE_NAME).toBe(siteName);
    expect(seoMetadata("home", none).description).toBe(siteDescription);
    expect(seoMetadata("home", none).alternates).toEqual({ canonical: "/" });
  });
});

describe("with the CMS's settings", () => {
  it("uses its title and description, for sharing too", () => {
    const metadata = seoMetadata("prices", {
      ...none,
      title: "Cennik terapii w Poznaniu",
      description: "Ile kosztuje terapia.",
    });
    expect(metadata.title).toEqual({ absolute: "Cennik terapii w Poznaniu" });
    expect(metadata.description).toBe("Ile kosztuje terapia.");
    expect(metadata.openGraph).toMatchObject({
      title: "Cennik terapii w Poznaniu",
      description: "Ile kosztuje terapia.",
    });
  });

  it("shares its own title, description and picture when given", () => {
    const metadata = seoMetadata("contact", {
      ...none,
      ogTitle: "Napisz do nas",
      ogDescription: "Odpowiemy w ciągu dnia.",
      ogImagePath: "seo/a.jpg",
      ogImageAlt: "Recepcja",
      ogImageUrl: "https://media.example.invalid/seo/a.jpg",
    });
    expect(metadata.title).toEqual({ absolute: "Kontakt | Kolor Sensu" });
    expect(metadata.openGraph).toMatchObject({
      title: "Napisz do nas",
      description: "Odpowiemy w ciągu dnia.",
      images: [
        { url: "https://media.example.invalid/seo/a.jpg", alt: "Recepcja" },
      ],
    });
  });

  it("keeps a page out of search engines when asked", () => {
    expect(seoMetadata("cookies", { ...none, noindex: true }).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it("is read from the CMS for the page", async () => {
    published = { ...none, title: "Specjaliści od terapii" };
    expect((await pageMetadata("specialists")).title).toEqual({
      absolute: "Specjaliści od terapii",
    });
  });
});
