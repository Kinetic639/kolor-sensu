import {
  FeatureSection,
  JsonLd,
  PrimaryButton,
  ServiceFacts,
  ServicePageView,
  serviceParagraphs,
} from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { bookingHref } from "@/features/booking/search-params";
import { bookingCta, rooms, siteUrl } from "@/content/site";
import {
  formatDuration,
  formatPrice,
  offerModes,
  priceRange,
  specialistHref,
} from "@/lib/presentation";
import {
  getBookableCatalog,
  getIntakeServiceSlugs,
  getService,
  getServiceOffers,
  getServices,
  getSpecialists,
  getWatercolorLook,
} from "@/lib/public-data";
import { serviceHref, serviceTitle } from "@/lib/site-frame";

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/oferta/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: "Nie znaleziono usługi" };
  return {
    title: serviceTitle(service),
    description:
      service.shortDescription ??
      service.description?.slice(0, 160) ??
      `${serviceTitle(service)} w Kolor Sensu.`,
    alternates: { canonical: serviceHref(service.slug) },
  };
}

export default async function ServicePage({
  params,
}: PageProps<"/oferta/[slug]">) {
  const { slug } = await params;
  const [service, offers, specialists, watercolor, intake, bookable] =
    await Promise.all([
      getService(slug),
      getServiceOffers(slug),
      getSpecialists(),
      getWatercolorLook(),
      getIntakeServiceSlugs(),
      getBookableCatalog(),
    ]);
  if (!service) notFound();
  // Into booking with this service chosen (#94), or as it is when it is
  // not booked online; the first meeting is the first-visit consultation
  // (the service that starts with the test).
  const bookThis: Route = bookable.services.some(
    (one) => one.slug === service.slug,
  )
    ? bookingHref({ usluga: service.slug })
    : "/umow-wizyte";
  const [firstVisit] = intake;
  const bookFirst: Route = firstVisit
    ? bookingHref({ usluga: firstVisit })
    : "/umow-wizyte";

  const title = serviceTitle(service);
  const paragraphs = serviceParagraphs(service.description);
  // Only offers of published specialists, with their names.
  const byTeam = offers.flatMap((offer) => {
    const specialist = specialists.find(
      (one) => one.publicSlug === offer.specialistPublicSlug,
    );
    return specialist ? [{ offer, specialist }] : [];
  });
  const price = priceRange(byTeam.map(({ offer }) => offer));

  return (
    <>
      <PageIntro
        eyebrow="Oferta"
        heading={title}
        lead={service.shortDescription ?? undefined}
      >
        <ServiceFacts
          duration={formatDuration(service.defaultDurationMinutes)}
          price={price}
        />
      </PageIntro>

      <ServicePageView
        action={
          <PrimaryButton asChild arrow>
            <Link href={bookThis}>{bookingCta.label}</Link>
          </PrimaryButton>
        }
        className="max-w-page px-gutter pb-section-sm mx-auto"
        paragraphs={paragraphs}
        team={byTeam.map(({ offer, specialist }) => ({
          key: specialist.publicSlug,
          name: specialist.displayName,
          href: specialistHref(specialist.publicSlug),
          meta: [
            formatPrice(offer),
            formatDuration(offer.effectiveDurationMinutes),
            offerModes(offer),
          ]
            .filter(Boolean)
            .join(" · "),
        }))}
      />

      <FeatureSection
        {...rooms}
        eyebrow="Jak pracujemy"
        heading="Spokojna rozmowa, bez oceniania"
        description="Na pierwszym spotkaniu poznajemy Twoją historię i to, co chcesz zmienić. Razem ustalamy cel i rytm spotkań."
        cta={{ href: bookFirst, label: "Umów pierwsze spotkanie" }}
        imagePosition="left"
        animationPreset="watercolor-reveal"
        watercolor={watercolor}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: title,
          description: service.shortDescription ?? paragraphs[0],
          url: `${siteUrl}${serviceHref(service.slug)}`,
          provider: { "@type": "MedicalBusiness", name: "Kolor Sensu" },
          ...(byTeam.length > 0 && {
            offers: byTeam.map(({ offer }) => ({
              "@type": "Offer",
              price: offer.priceMinor / 100,
              priceCurrency: offer.currencyCode,
            })),
          }),
        }}
      />
    </>
  );
}
