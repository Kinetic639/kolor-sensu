import { resolvePageSeo, type SeoPage } from "@repo/contracts";
import type { Metadata } from "next";
import { siteName } from "@/content/site";
import { getPageSeo, type PageSeo } from "@/lib/public-data";

// A static page's title, description, canonical address, link preview and
// indexing: the admin's settings from the CMS (seo_<page>) over the page's
// own (@repo/contracts/cms-seo). The share picture is the page's generated
// opengraph-image unless the CMS gives one: a page's own openGraph.images
// replaces the file's (Next fills them in only when it has none).

/** Open Graph's fields for every page (a page's openGraph replaces the layout's). */
export const baseOpenGraph = {
  type: "website",
  locale: "pl_PL",
  siteName,
} as const;

export function seoMetadata(page: SeoPage, seo: PageSeo): Metadata {
  const resolved = resolvePageSeo(page, seo);
  return {
    // Whole: the admin sees and counts the title as Google shows it.
    title: { absolute: resolved.title },
    description: resolved.description,
    alternates: { canonical: resolved.path },
    openGraph: {
      ...baseOpenGraph,
      title: resolved.ogTitle,
      description: resolved.ogDescription,
      url: resolved.path,
      ...(seo.ogImageUrl
        ? { images: [{ url: seo.ogImageUrl, alt: resolved.ogImageAlt }] }
        : {}),
    },
    ...(resolved.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** A static page's metadata (its generateMetadata). */
export async function pageMetadata(page: SeoPage): Promise<Metadata> {
  return seoMetadata(page, await getPageSeo(page));
}
