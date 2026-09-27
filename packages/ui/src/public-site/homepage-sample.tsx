import { PageLink as Link } from "./page-link";
import { PrimaryButton, SecondaryButton } from "./actions";
import { FaqSection } from "./faq-section";
import { sampleRooms, sampleWorkshops } from "./feature-samples";
import { FeatureSection } from "./feature-section";
import { sampleHero } from "./hero-samples";
import { HeroSection } from "./hero-section";
import { sampleOfferCopy, sampleServices } from "./offer-samples";
import { OfferSection } from "./offer-section";
import { sampleFaq } from "./site-samples";
import { sampleSpecialists, sampleSpecialistsCopy } from "./specialist-samples";
import { SpecialistsSection } from "./specialists-section";
import { WatercolorSectionBackground } from "./surfaces";
import { EditorialHeading } from "./typography";

// The homepage's sections with sample content, for Storybook (Examples and
// Pages). Not a page of the app: no routing or data loading here.

export function HomepageSections({ faq = true }: { faq?: boolean }) {
  return (
    <>
      <HeroSection {...sampleHero} animationPreset="watercolor-reveal" />
      <OfferSection
        services={sampleServices}
        {...sampleOfferCopy}
        animationPreset="brush-reveal"
      />
      <SpecialistsSection
        specialists={sampleSpecialists}
        {...sampleSpecialistsCopy}
        animationPreset="splash-reveal"
      />
      <FeatureSection {...sampleRooms} animationPreset="watercolor-reveal" />
      <FeatureSection
        {...sampleWorkshops}
        animationPreset="watercolor-reveal"
      />
      {faq ? (
        <FaqSection
          items={sampleFaq}
          description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
          cta={{ href: "/kontakt", label: "Masz inne pytanie? Napisz do nas" }}
        />
      ) : null}
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
    </>
  );
}
