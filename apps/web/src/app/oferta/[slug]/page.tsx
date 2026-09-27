import {
  ArrowLink,
  FeatureSection,
  JsonLd,
  PrimaryButton,
  SoftCard,
} from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import {
  bookingCta,
  rooms,
  serviceFallbackDescription,
  siteUrl,
} from "@/content/site";
import {
  formatDuration,
  formatPrice,
  offerModes,
  priceRange,
  specialistHref,
} from "@/lib/presentation";
import {
  getService,
  getServiceOffers,
  getServices,
  getSpecialists,
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
  const [service, offers, specialists] = await Promise.all([
    getService(slug),
    getServiceOffers(slug),
    getSpecialists(),
  ]);
  if (!service) notFound();

  const title = serviceTitle(service);
  const description = (service.description ?? serviceFallbackDescription)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
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
        trail={[{ label: "Oferta", href: "/oferta" }, { label: title }]}
        eyebrow="Oferta"
        heading={title}
        lead={service.shortDescription ?? undefined}
      >
        <dl className="text-small text-text-muted flex flex-wrap gap-x-8 gap-y-2">
          <div className="flex gap-2">
            <dt>Czas spotkania:</dt>
            <dd className="text-ink font-semibold">
              {formatDuration(service.defaultDurationMinutes)}
            </dd>
          </div>
          {price ? (
            <div className="flex gap-2">
              <dt>Cena:</dt>
              <dd className="text-ink font-semibold">{price}</dd>
            </div>
          ) : null}
        </dl>
      </PageIntro>

      <section className="max-w-page px-gutter pb-section-sm mx-auto grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <div className="text-body text-ink max-w-copy grid gap-4">
          {description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <PrimaryButton asChild arrow className="mt-2 justify-self-start">
            <Link href="/umow-wizyte">{bookingCta.label}</Link>
          </PrimaryButton>
        </div>

        <SoftCard className="grid gap-5 p-6 lg:p-8">
          <h2 className="font-display text-h3 text-ink">Kto prowadzi</h2>
          {byTeam.length === 0 ? (
            <p className="text-small text-text-muted">
              Skontaktuj się z nami, a dobierzemy specjalistę i termin.
            </p>
          ) : (
            <ul className="divide-border grid divide-y">
              {byTeam.map(({ offer, specialist }) => (
                <li
                  key={specialist.publicSlug}
                  className="grid gap-1 py-4 first:pt-0 last:pb-0"
                >
                  <ArrowLink
                    href={specialistHref(specialist.publicSlug) as Route}
                    className="justify-self-start"
                  >
                    {specialist.displayName}
                  </ArrowLink>
                  <p className="text-small text-text-muted">
                    {[
                      formatPrice(offer),
                      formatDuration(offer.effectiveDurationMinutes),
                      offerModes(offer),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {offer.acceptingNewClients
                      ? ""
                      : " · obecnie bez wolnych terminów"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SoftCard>
      </section>

      <FeatureSection
        {...rooms}
        eyebrow="Jak pracujemy"
        heading="Spokojna rozmowa, bez oceniania"
        description="Na pierwszym spotkaniu poznajemy Twoją historię i to, co chcesz zmienić. Razem ustalamy cel i rytm spotkań."
        cta={{ href: "/umow-wizyte", label: "Umów pierwsze spotkanie" }}
        imagePosition="left"
        animationPreset="watercolor-reveal"
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: title,
          description: service.shortDescription ?? description[0],
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
