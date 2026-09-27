import type { Meta, StoryObj } from "@storybook/react";
import { PrimaryButton, SecondaryButton } from "./actions";
import { sampleRooms, sampleWorkshops } from "./feature-samples";
import { FeatureSection } from "./feature-section";
import { sampleHero } from "./hero-samples";
import { HeroSection } from "./hero-section";
import { sampleOfferCopy, sampleServices } from "./offer-samples";
import { OfferSection } from "./offer-section";
import { sampleSpecialists, sampleSpecialistsCopy } from "./specialist-samples";
import { SpecialistsSection } from "./specialists-section";
import { WatercolorSectionBackground } from "./surfaces";
import { EditorialHeading } from "./typography";

// Isolated composition used to check the foundation against reference A.
// It is not a page: no routing, data or copy decisions live here.

function HomepageFragment() {
  return (
    <div className="bg-bg font-body text-ink overflow-x-clip">
      {/* Hero */}
      <HeroSection {...sampleHero} animationPreset="watercolor-reveal" />

      {/* Offer */}
      <OfferSection
        services={sampleServices}
        {...sampleOfferCopy}
        animationPreset="brush-reveal"
      />

      {/* Specialists */}
      <SpecialistsSection
        specialists={sampleSpecialists}
        {...sampleSpecialistsCopy}
        animationPreset="splash-reveal"
      />

      {/* Rooms */}
      <FeatureSection {...sampleRooms} animationPreset="watercolor-reveal" />

      {/* Workshops */}
      <FeatureSection
        {...sampleWorkshops}
        animationPreset="watercolor-reveal"
      />

      {/* Call to action */}
      <WatercolorSectionBackground accent className="my-section-sm py-16">
        <div className="max-w-page px-gutter mx-auto flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:pr-56">
          <EditorialHeading size="h3" className="lg:text-h2 max-w-xl">
            Zrób pierwszy krok do lepszego samopoczucia
          </EditorialHeading>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton arrow>Umów wizytę</PrimaryButton>
            <SecondaryButton>Skontaktuj się</SecondaryButton>
          </div>
        </div>
      </WatercolorSectionBackground>
    </div>
  );
}

const meta = {
  title: "Public site/Examples",
  component: HomepageFragment,
  parameters: { canvasPadding: false },
} satisfies Meta<typeof HomepageFragment>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomepageFragmentDesktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const HomepageFragmentMobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
