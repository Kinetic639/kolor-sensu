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
import { ClosingCta } from "@/components/closing-cta";
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
  getHomeHeaders,
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
  const [
    homeContent,
    headers,
    supportAreas,
    firstSteps,
    sections,
    specialists,
  ] = await Promise.all([
    getHomeContent(),
    getHomeHeaders(),
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
        header={headers.supportAreas}
        areas={toSupportAreaItems(
          supportAreas,
          defaultSupportAreas,
          bookingCta,
        )}
        cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
      />
      {firstSteps.visible ? (
        <FirstSteps header={headers.firstSteps} steps={firstSteps.steps} />
      ) : null}
      {spotlight ? (
        <SpecialistSpotlight
          {...spotlight}
          header={headers.spotlight}
          booking={bookingCta}
          animationPreset="splash-reveal"
        />
      ) : null}
      {sections.showSpecialists && specialists.length > 0 ? (
        <SpecialistsSection
          header={headers.specialists}
          specialists={specialists.slice(0, 3).map(toSpecialistCard)}
          animationPreset="splash-reveal"
        />
      ) : null}
      <FeatureSection
        header={headers.rooms}
        image={rooms.image}
        imagePosition="left"
        animationPreset="watercolor-reveal"
      />
      <PaintedStory header={headers.story} steps={story.steps} />
      <FaqSection items={faq} header={headers.faq} />
      <ClosingCta />
    </>
  );
}
