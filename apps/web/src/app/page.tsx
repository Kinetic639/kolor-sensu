import {
  CrisisStrip,
  FirstSteps,
  HeroSection,
  PaintedStory,
  RoomsPeek,
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
  getRoomsByLocation,
  getSpecialists,
  getSupportAreas,
  getWhyUs,
} from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import { toRoomsPeekPhotos } from "@/lib/rooms-peek";
import { toSpotlight } from "@/lib/spotlight";
import { toSupportAreaItems } from "@/lib/support-areas";
import { pageMetadata } from "@/lib/page-metadata";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("home");
}

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
    roomGroups,
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
    getRoomsByLocation(),
  ]);
  const spotlight = toSpotlight(sections, specialists);
  const roomPhotos = toRoomsPeekPhotos(roomGroups);

  return (
    <>
      {/* No entrance animation: the hero picture is the page's largest
          paint, and the reveal kept it hidden until the script ran. */}
      <HeroSection {...withHomeContent(hero, homeContent)} />
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
      {roomPhotos.length > 0 ? (
        <RoomsPeek header={headers.rooms} photos={roomPhotos} />
      ) : null}
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
        more={{
          href: "/pomoc-w-kryzysie",
          label: "Więcej o pomocy w kryzysie",
        }}
      />
      {location.visible && frame.contact ? (
        <HomeLocation header={headers.location} contact={frame.contact} />
      ) : null}
      <ClosingCta />
    </>
  );
}
