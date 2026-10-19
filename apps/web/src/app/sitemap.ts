import { SEO_PAGES } from "@repo/contracts";
import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { specialistHref } from "@/lib/presentation";
import { getPageSeo, getServices, getSpecialists } from "@/lib/public-data";
import { serviceHref } from "@/lib/site-frame";

// Every public page, including each published service and specialist,
// but those the CMS keeps out of search engines ("noindex").
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, specialists, hidden] = await Promise.all([
    getServices(),
    getSpecialists(),
    hiddenPaths(),
  ]);
  const page = (
    path: string,
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly",
    priority,
  });

  const pages = [
    page("/", 1),
    page("/oferta", 0.9),
    page("/specjalisci", 0.9),
    page("/umow-wizyte", 0.8),
    page("/cennik", 0.8),
    page("/kontakt", 0.8),
    page("/o-nas", 0.7),
    page("/gabinety", 0.6),
    page("/warsztaty", 0.6),
    page("/edukacja", 0.6),
    page("/pomoc-w-kryzysie", 0.5),
    ...services.map((service) => page(serviceHref(service.slug), 0.8)),
    ...specialists.map((specialist) =>
      page(specialistHref(specialist.publicSlug), 0.7),
    ),
    page("/polityka-prywatnosci", 0.2),
    page("/regulamin", 0.2),
    page("/cookies", 0.2),
  ];
  return pages.filter((entry) => !hidden.has(entry.url));
}

/** The static pages' addresses the CMS keeps out of search engines. */
async function hiddenPaths(): Promise<Set<string>> {
  const settings = await Promise.all(
    SEO_PAGES.map(async ({ page, path }) => ({
      path,
      seo: await getPageSeo(page),
    })),
  );
  return new Set(
    settings
      .filter(({ seo }) => seo.noindex)
      .map(({ path }) => `${siteUrl}${path}`),
  );
}
