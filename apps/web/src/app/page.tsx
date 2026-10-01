import {
  BentoSection,
  FaqSection,
  FeatureSection,
  GuidedChoiceSection,
  HeroSection,
  OfferSection,
  ScrollStory,
  ScrollStoryPath,
  SpecialistsSection,
  StoryStepsSection,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import {
  bento,
  faq,
  guidedChoice,
  hero,
  offerCopy,
  rooms,
  specialistsCopy,
  storySteps,
  workshops,
} from "@/content/site";
import { toGuidedSpecialist } from "@/lib/guided-choice";
import { withHomeContent } from "@/lib/home-content";
import { toOfferTile, toSpecialistCard } from "@/lib/presentation";
import { getHomeContent, getServices, getSpecialists } from "@/lib/public-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The "living" homepage: a scroll story (docs/design, §13). One wide brush
// stroke runs behind the whole page, from its top to behind the footer,
// and paints itself in as the page scrolls.
export default async function Home() {
  const [homeContent, services, specialists] = await Promise.all([
    getHomeContent(),
    getServices(),
    getSpecialists(),
  ]);

  return (
    <ScrollStory>
      <ScrollStoryPath>
        <HeroSection
          {...withHomeContent(hero, homeContent)}
          animationPreset="watercolor-reveal"
        />
        <StoryStepsSection
          id="jak-zaczynamy"
          steps={storySteps}
          cta={{ href: "/kontakt", label: "Napisz do nas" }}
        />
        {services.length > 0 ? (
          <OfferSection
            {...offerCopy}
            services={services.slice(0, 4).map(toOfferTile)}
            cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
            animationPreset="brush-reveal"
          />
        ) : null}
        <GuidedChoiceSection
          id="dopasowanie"
          {...guidedChoice}
          specialists={specialists.map(toGuidedSpecialist)}
        />
        {specialists.length > 0 ? (
          <SpecialistsSection
            {...specialistsCopy}
            specialists={specialists.slice(0, 3).map(toSpecialistCard)}
            cta={{
              href: "/specjalisci",
              label: "Zobacz wszystkich specjalistów",
            }}
            animationPreset="splash-reveal"
          />
        ) : null}
        <BentoSection items={bento} />
        <FeatureSection
          {...rooms}
          cta={{ href: "/gabinety", label: "Zobacz nasze gabinety" }}
          imagePosition="left"
          animationPreset="watercolor-reveal"
        />
        <FeatureSection
          {...workshops}
          cta={{ href: "/warsztaty", label: "Zobacz nadchodzące wydarzenia" }}
          imagePosition="right"
          animationPreset="watercolor-reveal"
        />
        <FaqSection
          items={faq}
          description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
          cta={{
            href: "/kontakt",
            label: "Masz inne pytanie? Napisz do nas",
          }}
        />
        <ClosingCta />
      </ScrollStoryPath>
    </ScrollStory>
  );
}
