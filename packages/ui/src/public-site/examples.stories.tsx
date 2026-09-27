import type { Meta, StoryObj } from "@storybook/react";
import { ArrowLink, PrimaryButton, SecondaryButton } from "./actions";
import { sampleHero } from "./hero-samples";
import { HeroSection } from "./hero-section";
import { sampleOfferCopy, sampleServices } from "./offer-samples";
import { OfferSection } from "./offer-section";
import { sampleSpecialists, sampleSpecialistsCopy } from "./specialist-samples";
import { SpecialistsSection } from "./specialists-section";
import { WatercolorSectionBackground } from "./surfaces";
import { EditorialHeading, SectionEyebrow } from "./typography";
import { WatercolorImage } from "./watercolor-image";

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
      <section className="max-w-page px-gutter py-section-sm mx-auto grid items-center gap-10 lg:grid-cols-2">
        <WatercolorImage
          src="/kolor-sensu/room.jpg"
          alt="Gabinet z beżowym fotelem, stolikiem i roślinami"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <div className="grid gap-4">
          <SectionEyebrow>Nasze gabinety</SectionEyebrow>
          <EditorialHeading>Przestrzeń, która wspiera</EditorialHeading>
          <p className="max-w-copy text-body text-text-muted">
            Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i
            poczuciu bezpieczeństwa.
          </p>
          <ArrowLink href="#gabinety">Zobacz nasze gabinety</ArrowLink>
        </div>
      </section>

      {/* Workshops */}
      <section className="max-w-page px-gutter py-section-sm mx-auto grid items-center gap-10 lg:grid-cols-2">
        <div className="grid gap-4 lg:order-first">
          <SectionEyebrow>Warsztaty i rozwój</SectionEyebrow>
          <EditorialHeading>Wydarzenia, które inspirują</EditorialHeading>
          <p className="max-w-copy text-body text-text-muted">
            Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które
            chcą lepiej siebie rozumieć.
          </p>
          <ArrowLink href="#warsztaty">Zobacz nadchodzące wydarzenia</ArrowLink>
        </div>
        <WatercolorImage
          src="/kolor-sensu/group.jpg"
          alt="Uczestnicy warsztatu rozmawiają w kręgu"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </section>

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
