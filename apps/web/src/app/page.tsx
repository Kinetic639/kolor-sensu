import {
  FaqSection,
  FeatureSection,
  FirstSteps,
  HeroSection,
  PaintedStory,
  SpecialistSpotlight,
  SpecialistsSection,
  SupportAreas,
  ThoughtsLens,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import { plainHeader } from "@repo/contracts";
import { ClosingCta } from "@/components/closing-cta";
import { homeHeaders } from "@/content/home-headers";
import {
  bookingCta,
  defaultSupportAreas,
  faq,
  hero,
  rooms,
  story,
  thoughts,
} from "@/content/site";
import { withHomeContent } from "@/lib/home-content";
import { toSpecialistCard } from "@/lib/presentation";
import {
  getFirstSteps,
  getHomeContent,
  getHomeSections,
  getSpecialists,
  getSupportAreas,
} from "@/lib/public-data";
import { toSpotlight } from "@/lib/spotlight";
import { toSupportAreaItems } from "@/lib/support-areas";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [homeContent, supportAreas, firstSteps, sections, specialists] =
    await Promise.all([
      getHomeContent(),
      getSupportAreas(),
      getFirstSteps(),
      getHomeSections(),
      getSpecialists(),
    ]);
  const spotlight = toSpotlight(sections, specialists);

  return (
    <>
      <HeroSection
        {...withHomeContent(hero, homeContent)}
        animationPreset="watercolor-reveal"
      />
      <ThoughtsLens {...thoughts} />
      <SupportAreas
        header={homeHeaders.supportAreas}
        areas={toSupportAreaItems(
          supportAreas,
          defaultSupportAreas,
          bookingCta,
        )}
        cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
      />
      {firstSteps.visible ? (
        <FirstSteps
          header={plainHeader({
            eyebrow: firstSteps.eyebrow,
            title: firstSteps.heading,
            description: firstSteps.description,
          })}
          steps={firstSteps.steps}
        />
      ) : null}
      {spotlight ? (
        <SpecialistSpotlight
          {...spotlight}
          booking={bookingCta}
          animationPreset="splash-reveal"
        />
      ) : null}
      {sections.showSpecialists && specialists.length > 0 ? (
        <SpecialistsSection
          header={homeHeaders.specialists}
          specialists={specialists.slice(0, 3).map(toSpecialistCard)}
          animationPreset="splash-reveal"
        />
      ) : null}
      <FeatureSection
        header={homeHeaders.rooms}
        image={rooms.image}
        imagePosition="left"
        animationPreset="watercolor-reveal"
      />
      <PaintedStory header={homeHeaders.story} steps={story.steps} />
      <FaqSection items={faq} header={homeHeaders.faq} />
      <ClosingCta />
    </>
  );
}
