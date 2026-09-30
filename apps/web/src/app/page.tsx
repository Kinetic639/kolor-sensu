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
  StoryAnchor,
  StorySplash,
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

// The "living" homepage: a scroll story (docs/design, §13). The first
// screens share one watercolor path that paints itself in as the page
// scrolls; further down, washes flow in from the sides.
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
        <StoryAnchor name="steps">
          <StoryStepsSection
            id="jak-zaczynamy"
            steps={storySteps}
            cta={{ href: "/kontakt", label: "Napisz do nas" }}
          />
        </StoryAnchor>
        {services.length > 0 ? (
          <StoryAnchor name="offer">
            <OfferSection
              {...offerCopy}
              services={services.slice(0, 4).map(toOfferTile)}
              cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
              animationPreset="brush-reveal"
            />
          </StoryAnchor>
        ) : null}
        <StoryAnchor name="guided">
          <GuidedChoiceSection
            id="dopasowanie"
            {...guidedChoice}
            specialists={specialists.map(toGuidedSpecialist)}
          />
        </StoryAnchor>
        {specialists.length > 0 ? (
          <StoryAnchor name="specialists">
            <SpecialistsSection
              {...specialistsCopy}
              specialists={specialists.slice(0, 3).map(toSpecialistCard)}
              cta={{
                href: "/specjalisci",
                label: "Zobacz wszystkich specjalistów",
              }}
              animationPreset="splash-reveal"
            />
          </StoryAnchor>
        ) : null}
      </ScrollStoryPath>

      <div className="relative">
        <StorySplash side="right" tone="sage" at="25%" />
        <BentoSection items={bento} />
      </div>
      <FeatureSection
        {...rooms}
        cta={{ href: "/gabinety", label: "Zobacz nasze gabinety" }}
        imagePosition="left"
        animationPreset="watercolor-reveal"
      />
      <div className="relative">
        <StorySplash side="right" tone="blush" at="55%" />
        <FeatureSection
          {...workshops}
          cta={{ href: "/warsztaty", label: "Zobacz nadchodzące wydarzenia" }}
          imagePosition="right"
          animationPreset="watercolor-reveal"
        />
      </div>
      <div className="relative">
        <StorySplash side="left" tone="sage" at="40%" />
        <FaqSection
          items={faq}
          description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
          cta={{ href: "/kontakt", label: "Masz inne pytanie? Napisz do nas" }}
        />
      </div>
      <ClosingCta />
    </ScrollStory>
  );
}
