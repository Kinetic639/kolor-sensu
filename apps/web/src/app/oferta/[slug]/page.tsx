import {
  FeatureSection,
  JsonLd,
  PrimaryButton,
  SecondaryButton,
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
  getServicePage,
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
  const [service, offers, specialists, watercolor, intake, bookable, words] =
    await Promise.all([
      getService(slug),
      getServiceOffers(slug),
      getSpecialists(),
      getWatercolorLook(),
      getIntakeServiceSlugs(),
      getBookableCatalog(),
      getServicePage(),
    ]);
  if (!service) notFound();
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
  // Booked online: "Umów" opens booking with this service chosen (#94)
  // and the prices show. Otherwise (no specialist offers it, or its online
  // booking is off) the price is agreed and the visitor calls or writes.
  const online =
    byTeam.length > 0 &&
    bookable.services.some((one) => one.slug === service.slug);
  const price = online
    ? priceRange(byTeam.map(({ offer }) => offer))
    : words.unbooked.priceText;

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
          online ? (
            <PrimaryButton asChild arrow>
              <Link href={bookingHref({ usluga: service.slug })}>
                {bookingCta.label}
              </Link>
            </PrimaryButton>
          ) : (
            <SecondaryButton asChild arrow>
              <Link href="/kontakt">{words.unbooked.contactLabel}</Link>
            </SecondaryButton>
          )
        }
        className="max-w-page px-gutter pb-section-sm mx-auto"
        paragraphs={paragraphs}
        team={byTeam.map(({ offer, specialist }) => ({
          key: specialist.publicSlug,
          name: specialist.displayName,
          href: specialistHref(specialist.publicSlug),
          meta: [
            online ? formatPrice(offer) : null,
            formatDuration(offer.effectiveDurationMinutes),
            offerModes(offer),
          ]
            .filter(Boolean)
            .join(" · "),
        }))}
      />

      <FeatureSection
        {...rooms}
        eyebrow={words.howWeWork.eyebrow || undefined}
        heading={words.howWeWork.heading}
        description={words.howWeWork.description || undefined}
        cta={{ href: bookFirst, label: words.howWeWork.ctaLabel }}
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
          ...(online && {
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
