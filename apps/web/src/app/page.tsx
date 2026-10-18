import {
  CrisisStrip,
  FeatureSection,
  FirstSteps,
  HeroSection,
  PaintedStory,
  SpecialistSpotlight,
  SpecialistsSection,
  SupportAreas,
  NewsletterBand,
  ThoughtsLens,
  WhyUsSection,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { HomeLocation } from "@/components/home-location";
import {
  bookingCta,
  defaultSupportAreas,
  hero,
  rooms,
  storyImages,
} from "@/content/site";
import { toStorySteps, withHomeContent } from "@/lib/home-content";
import { toSpecialistCard } from "@/lib/presentation";
import {
  getCrisisHelp,
  getFirstSteps,
  getHomeContent,
  getHomeHeaders,
  getHomeLocation,
  getHomeSections,
  getHomeStory,
  getHomeThoughts,
  getNewsletterBand,
  getSpecialists,
  getSupportAreas,
  getWhyUs,
} from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
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
    whyUs,
    newsletter,
    location,
    crisis,
    frame,
    thoughts,
    story,
  ] = await Promise.all([
    getHomeContent(),
    getHomeHeaders(),
    getSupportAreas(),
    getFirstSteps(),
    getHomeSections(),
    getSpecialists(),
    getWhyUs(),
    getNewsletterBand(),
    getHomeLocation(),
    getCrisisHelp(),
    getSiteFrame(),
    getHomeThoughts(),
    getHomeStory(),
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
      {whyUs.visible ? (
        <WhyUsSection header={headers.whyUs} facts={whyUs.facts} />
      ) : null}
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
      <PaintedStory
        header={headers.story}
        steps={toStorySteps(story, storyImages)}
      />
      {newsletter.visible ? (
        <NewsletterBand header={headers.newsletter} />
      ) : null}
      <CrisisStrip
        heading={crisis.heading}
        text={crisis.text}
        lines={crisis.lines}
      />
      {location.visible && frame.contact ? (
        <HomeLocation header={headers.location} contact={frame.contact} />
      ) : null}
      <ClosingCta />
    </>
  );
}
