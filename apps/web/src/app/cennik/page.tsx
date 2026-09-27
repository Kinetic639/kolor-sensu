import { ArrowLink, SoftCard } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import {
  formatDuration,
  formatPrice,
  offerModes,
  specialistHref,
} from "@/lib/presentation";
import { getPriceList, getSpecialists } from "@/lib/public-data";
import { serviceHref, serviceTitle } from "@/lib/site-frame";

export const metadata: Metadata = {
  title: "Cennik",
  description:
    "Ceny konsultacji, psychoterapii i terapii par w Kolor Sensu, u każdego ze specjalistów.",
  alternates: { canonical: "/cennik" },
};

export default async function PricesPage() {
  const [priceList, specialists] = await Promise.all([
    getPriceList(),
    getSpecialists(),
  ]);
  const name = (slug: string) =>
    specialists.find((one) => one.publicSlug === slug)?.displayName;

  return (
    <>
      <PageIntro
        eyebrow="Cennik"
        heading="Cennik"
        accent="Jasno i bez niespodzianek."
        lead="Cena zależy od formy wsparcia i specjalisty. Poniżej znajdziesz aktualne ceny wszystkich usług."
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 lg:grid-cols-2">
        {priceList.length === 0 ? (
          <p className="text-body text-text-muted max-w-copy">
            Cennik pojawi się tu wkrótce. Zapytaj nas o ceny telefonicznie lub
            mailowo.
          </p>
        ) : (
          priceList.map(({ service, offers }) => {
            const rows = offers.flatMap((offer) => {
              const specialist = name(offer.specialistPublicSlug);
              return specialist ? [{ offer, specialist }] : [];
            });
            return (
              <SoftCard
                key={service.id}
                className="grid content-start gap-4 p-6 lg:p-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-h3 text-ink">
                    {serviceTitle(service)}
                  </h2>
                  <span className="text-small text-text-muted">
                    {formatDuration(service.defaultDurationMinutes)}
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="text-small text-text-muted">
                    Cena ustalana indywidualnie. Zapytaj nas o szczegóły.
                  </p>
                ) : (
                  <table className="text-small w-full">
                    <caption className="sr-only">
                      {`Ceny: ${serviceTitle(service)}`}
                    </caption>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Specjalista</th>
                        <th scope="col">Szczegóły</th>
                        <th scope="col">Cena</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {rows.map(({ offer, specialist }) => (
                        <tr key={offer.specialistPublicSlug}>
                          <th
                            scope="row"
                            className="py-3 pr-4 text-left font-semibold"
                          >
                            <Link
                              href={
                                specialistHref(
                                  offer.specialistPublicSlug,
                                ) as Route
                              }
                              className="hover:text-primary-strong underline-offset-4 hover:underline"
                            >
                              {specialist}
                            </Link>
                          </th>
                          <td className="text-text-muted py-3 pr-4">
                            {[
                              formatDuration(offer.effectiveDurationMinutes),
                              offerModes(offer),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </td>
                          <td className="text-ink py-3 text-right font-semibold whitespace-nowrap">
                            {formatPrice(offer)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <ArrowLink
                  href={serviceHref(service.slug) as Route}
                  className="justify-self-start"
                >
                  Więcej o usłudze
                </ArrowLink>
              </SoftCard>
            );
          })
        )}
      </section>
      <ClosingCta />
    </>
  );
}
