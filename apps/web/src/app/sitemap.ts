import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { specialistHref } from "@/lib/presentation";
import { getServices, getSpecialists } from "@/lib/public-data";
import { serviceHref } from "@/lib/site-frame";

// Every public page, including each published service and specialist.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, specialists] = await Promise.all([
    getServices(),
    getSpecialists(),
  ]);
  const page = (
    path: string,
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly",
    priority,
  });

  return [
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
}
