import { FaqSection, OfferTile } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { faq, offerCopy } from "@/content/site";
import { toOfferTile } from "@/lib/presentation";
import { getServices } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Oferta",
  description:
    "Psychoterapia indywidualna, terapia par, wsparcie dzieci i młodzieży oraz konsultacje psychologiczne w Kolor Sensu.",
  alternates: { canonical: "/oferta" },
};

const STAGGER = 0.1;

export default async function OfferPage() {
  const services = await getServices();

  return (
    <>
      <PageIntro
        trail={[{ label: "Oferta" }]}
        eyebrow={offerCopy.eyebrow}
        heading="Oferta"
        accent={offerCopy.heading}
        lead={offerCopy.description}
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        {services.length === 0 ? (
          <p className="text-body text-text-muted max-w-copy">
            Opis naszej oferty pojawi się tu wkrótce. Zadzwoń lub napisz do nas,
            a opowiemy, w czym możemy pomóc.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {services.map((service, index) => (
              <li key={service.id}>
                <OfferTile
                  {...toOfferTile(service, index)}
                  as="div"
                  headingLevel="h2"
                  animationPreset="brush-reveal"
                  matte={index % 2 ? "b" : "a"}
                  revealDelay={(index % 4) * STAGGER}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <FaqSection items={faq.slice(0, 3)} heading="Zanim się zapiszesz" />
      <ClosingCta />
    </>
  );
}
