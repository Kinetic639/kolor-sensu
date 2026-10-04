import { catalogAnchor } from "@repo/contracts";
import { EditorialHeading, FaqSection, OfferTile } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { faq, offerCopy } from "@/content/site";
import { toOfferTile } from "@/lib/presentation";
import { getOffer, type PublicService } from "@/lib/public-data";
import { offerBlocks } from "./offer-blocks";

export const metadata: Metadata = {
  title: "Oferta",
  description:
    "Psychoterapia indywidualna, terapia par, wsparcie dzieci i młodzieży oraz konsultacje psychologiczne w Kolor Sensu.",
  alternates: { canonical: "/oferta" },
};

const STAGGER = 0.1;

/** The tiles of a run of services; their watercolors by their place. */
function Tiles({
  services,
  from,
  headingLevel,
}: {
  services: PublicService[];
  /** The first one's place in the whole offer. */
  from: number;
  headingLevel: "h2" | "h3";
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      {services.map((service, at) => {
        const index = from + at;
        return (
          <li key={service.id}>
            <OfferTile
              {...toOfferTile(service, index)}
              as="div"
              headingLevel={headingLevel}
              animationPreset="brush-reveal"
              matte={index % 2 ? "b" : "a"}
              revealDelay={(at % 4) * STAGGER}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default async function OfferPage() {
  const offer = await getOffer();
  const blocks = offerBlocks(offer);

  return (
    <>
      <PageIntro
        eyebrow={offerCopy.eyebrow}
        heading="Oferta"
        accent={offerCopy.heading}
        lead={offerCopy.description}
      />
      <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-14">
        {blocks.length === 0 ? (
          <p className="text-body text-text-muted max-w-copy">
            Opis naszej oferty pojawi się tu wkrótce. Zadzwoń lub napisz do nas,
            a opowiemy, w czym możemy pomóc.
          </p>
        ) : (
          blocks.map((block) =>
            block.catalog ? (
              // A catalogue: the menu's link lands here.
              <section
                aria-labelledby={`${catalogAnchor(block.catalog.name)}-heading`}
                className="grid scroll-mt-28 gap-6"
                id={catalogAnchor(block.catalog.name)}
                key={block.catalog.id}
              >
                <EditorialHeading
                  as="h2"
                  id={`${catalogAnchor(block.catalog.name)}-heading`}
                  size="h3"
                >
                  {block.catalog.name}
                </EditorialHeading>
                <Tiles
                  from={block.from}
                  headingLevel="h3"
                  services={block.services}
                />
              </section>
            ) : (
              <Tiles
                from={block.from}
                headingLevel="h2"
                key={block.services[0]!.id}
                services={block.services}
              />
            ),
          )
        )}
      </div>
      <FaqSection items={faq.slice(0, 3)} heading="Zanim się zapiszesz" />
      <ClosingCta />
    </>
  );
}
