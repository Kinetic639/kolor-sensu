import { SEO_PAGES } from "@repo/contracts";
import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { specialistHref } from "@/lib/presentation";
import { getPageSeo, getServices, getSpecialists } from "@/lib/public-data";
import { serviceHref } from "@/lib/site-frame";
import {
  ARTICLES_PATH,
  articleHref,
  categoryHref,
  usedCategories,
} from "@/features/education/article-view";
import { EBOOKS_PATH, ebookHref } from "@/features/education/ebook-view";
import {
  getArticleCategories,
  getArticles,
  getEbooks,
} from "@/lib/education-data";
import { getNewsletterArchive } from "@/lib/newsletter-data";
import { getWorkshops } from "@/lib/workshop-data";
import { workshopHref } from "@/features/workshops/workshop-view";
import { newsletterArchiveHref } from "@repo/contracts/newsletter-issue";

// Every public page, including each published service, specialist and
// article and e-book (with the date its text last changed), each published
// workshop and each category in use,
// and the newsletter's archive once an issue is in it, but those the CMS
// keeps out of search engines ("noindex").
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    services,
    specialists,
    hidden,
    articles,
    categories,
    ebooks,
    issues,
    workshops,
  ] = await Promise.all([
    getServices(),
    getSpecialists(),
    hiddenPaths(),
    getArticles(),
    getArticleCategories(),
    getEbooks(),
    getNewsletterArchive(),
    getWorkshops(),
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
    ...workshops
      .filter((workshop) => workshop.status === "published")
      .map((workshop) => ({
        ...page(workshopHref(workshop.slug), 0.6),
        lastModified: workshop.updatedAt,
      })),
    page("/edukacja", 0.6),
    ...(articles.length
      ? [
          page(ARTICLES_PATH, 0.6),
          ...usedCategories(categories, articles).map((category) =>
            page(categoryHref(category.slug), 0.5),
          ),
          ...articles.map((article) => ({
            ...page(articleHref(article.slug), 0.6),
            lastModified: article.contentUpdatedAt,
          })),
        ]
      : []),
    ...(ebooks.length
      ? [
          page(EBOOKS_PATH, 0.6),
          ...ebooks.map((ebook) => ({
            ...page(ebookHref(ebook.slug), 0.6),
            lastModified: ebook.contentUpdatedAt,
          })),
        ]
      : []),
    ...(issues.length
      ? [
          page("/newsletter", 0.4),
          ...issues.map((issue) => ({
            ...page(newsletterArchiveHref(issue.number), 0.3),
            lastModified: issue.sendAt,
          })),
        ]
      : []),
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
