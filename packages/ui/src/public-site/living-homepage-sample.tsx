import { PageLink as Link } from "./page-link";
import { PrimaryButton, SecondaryButton } from "./actions";
import { BentoSection } from "./bento-section";
import { FaqSection } from "./faq-section";
import { sampleRooms, sampleWorkshops } from "./feature-samples";
import { FeatureSection } from "./feature-section";
import { GuidedChoiceSection } from "./guided-choice-section";
import { sampleHero } from "./hero-samples";
import { HeroSection } from "./hero-section";
import {
  sampleBento,
  sampleGuidedChoice,
  sampleStorySteps,
} from "./living-samples";
import { sampleOfferCopy, sampleServices } from "./offer-samples";
import { OfferSection } from "./offer-section";
import { ScrollStory, ScrollStoryPath, StorySplash } from "./scroll-story";
import { sampleFaq } from "./site-samples";
import { sampleSpecialists, sampleSpecialistsCopy } from "./specialist-samples";
import { SpecialistsSection } from "./specialists-section";
import { StoryStepsSection } from "./story-steps-section";
import { WatercolorSectionBackground } from "./surfaces";
import { EditorialHeading } from "./typography";

// The "living" homepage, for Storybook: the same sections as the current
// homepage, in the same places, over a scroll story. The first four
// screens share one watercolor path that paints itself in as the page
// scrolls (ScrollStoryPath); further down, washes flow in from the sides
// (StorySplash). New sections: the steps of a first visit, the guided
// choice and one modular (bento) section. Not a page of the app.

export function LivingHomepageSections() {
  return (
    <ScrollStory>
      <ScrollStoryPath>
        <HeroSection {...sampleHero} animationPreset="watercolor-reveal" />
        <StoryStepsSection
          id="jak-zaczynamy"
          steps={sampleStorySteps}
          cta={{ href: "#kontakt", label: "Napisz do nas" }}
        />
        <OfferSection
          services={sampleServices}
          {...sampleOfferCopy}
          animationPreset="brush-reveal"
        />
        <GuidedChoiceSection id="dopasowanie" {...sampleGuidedChoice} />
        <SpecialistsSection
          specialists={sampleSpecialists}
          {...sampleSpecialistsCopy}
          animationPreset="splash-reveal"
        />
      </ScrollStoryPath>

      <div className="relative">
        <StorySplash side="right" tone="sage" at="25%" />
        <BentoSection items={sampleBento} />
      </div>
      <FeatureSection {...sampleRooms} animationPreset="watercolor-reveal" />
      <div className="relative">
        <StorySplash side="right" tone="blush" at="55%" />
        <FeatureSection
          {...sampleWorkshops}
          animationPreset="watercolor-reveal"
        />
      </div>
      <div className="relative">
        <StorySplash side="left" tone="sage" at="40%" />
        <FaqSection
          items={sampleFaq}
          description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
          cta={{ href: "/kontakt", label: "Masz inne pytanie? Napisz do nas" }}
        />
      </div>
      <WatercolorSectionBackground accent className="my-section-sm py-16">
        <div className="max-w-page px-gutter mx-auto flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:pr-56">
          <EditorialHeading size="h3" className="lg:text-h2 max-w-xl">
            Zrób pierwszy krok do lepszego samopoczucia
          </EditorialHeading>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton asChild arrow>
              <Link href="/umow-wizyte">Umów wizytę</Link>
            </PrimaryButton>
            <SecondaryButton asChild>
              <Link href="/kontakt">Skontaktuj się</Link>
            </SecondaryButton>
          </div>
        </div>
      </WatercolorSectionBackground>
    </ScrollStory>
  );
}
