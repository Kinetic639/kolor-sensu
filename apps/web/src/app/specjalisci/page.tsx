import { SpecialistWatercolorCard } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { specialistsCopy } from "@/content/site";
import { toSpecialistCard } from "@/lib/presentation";
import { getSpecialists } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Specjaliści",
  description:
    "Poznaj psychoterapeutów i psychologów Kolor Sensu: ich doświadczenie, podejście i formy pracy.",
  alternates: { canonical: "/specjalisci" },
};

// Cards entering together, each a little after the one before; every other
// one blooms mirrored (as in SpecialistsSection).
const STAGGER = 0.12;

export default async function SpecialistsPage() {
  const specialists = await getSpecialists();

  return (
    <>
      <PageIntro
        trail={[{ label: "Specjaliści" }]}
        eyebrow={specialistsCopy.eyebrow}
        heading="Specjaliści"
        accent="Ludzie, którzy słuchają."
        lead={specialistsCopy.description}
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        {specialists.length === 0 ? (
          <p className="text-body text-text-muted max-w-copy">
            Profile naszych specjalistów pojawią się tu wkrótce. Zadzwoń lub
            napisz do nas, a pomożemy dobrać osobę i termin.
          </p>
        ) : (
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {specialists.map((specialist, index) => (
              <li
                key={specialist.specialistId}
                className="mx-auto w-full max-w-80"
              >
                <SpecialistWatercolorCard
                  {...toSpecialistCard(specialist, index)}
                  as="div"
                  headingLevel="h2"
                  animationPreset="splash-reveal"
                  matte={index % 2 ? "b" : "a"}
                  revealDelay={(index % 3) * STAGGER}
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <ClosingCta heading="Nie wiesz, do kogo się zapisać? Pomożemy wybrać." />
    </>
  );
}
