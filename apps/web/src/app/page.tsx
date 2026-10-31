import { Suspense } from "react";
import { SpecialistBooking } from "@/features/booking/specialist-booking";
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
import { HomeWorkshops } from "@/components/home-workshops";
import { NewsletterSignup } from "@/features/newsletter/newsletter-signup";
import { newsletterSiteKey } from "@/features/newsletter/site-key";
import {
  bookingCta,
  defaultSupportAreas,
  hero,
  storyImages,
} from "@/content/site";
import { withHomeContent } from "@/lib/home-content";
import { educationStorySteps } from "@/features/education/home-story";
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
  getWatercolorLook,
  getWhyUs,
  getClosingCta,
  getCompany,
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
    watercolor,
    closing,
    company,
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
    getWatercolorLook(),
    getClosingCta(),
    getCompany(),
  ]);
  const newsletterKey = newsletter.visible ? newsletterSiteKey() : null;
  const spotlight = toSpotlight(sections, specialists);
  const roomPhotos = toRoomsPeekPhotos(roomGroups, sections.roomsPeek);
  const storySteps = await educationStorySteps(story, storyImages, watercolor);

  return (
    <>
      {/* Painted in on a computer; on a phone only the backdrop is, and
          the photo (the page's largest paint) shows at once. */}
      <HeroSection
        {...withHomeContent(hero, homeContent)}
        watercolor={watercolor}
        animationPreset="watercolor-reveal"
      />
      <ThoughtsLens {...thoughts} />
      {whyUs.visible ? (
        <WhyUsSection header={headers.whyUs} facts={whyUs.facts} />
      ) : null}
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
          bookingPanel={
            <Suspense
              fallback={
                <div className="ks-booking-mini__message">
                  Przygotowujemy kalendarz…
                </div>
              }
            >
              <SpecialistBooking
                specialistSlug={spotlight.specialist.href.split("/").pop()!}
                specialistName={spotlight.specialist.name}
              />
            </Suspense>
          }
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
      <HomeWorkshops header={headers.workshops} />
      <PaintedStory
        header={headers.story}
        steps={storySteps}
        watercolor={watercolor}
      />
      {newsletterKey ? (
        <NewsletterBand header={headers.newsletter}>
          <NewsletterSignup
            controller={company?.legalName ?? "Kolor Sensu"}
            source="home"
            turnstileSiteKey={newsletterKey}
          />
        </NewsletterBand>
      ) : null}
      <CrisisStrip
        header={crisis.header}
        eyebrow={crisis.eyebrow}
        heading={crisis.heading}
        text={crisis.text}
        lines={crisis.lines}
        more={{
          href: "/pomoc-w-kryzysie",
          label: crisis.moreLabel,
        }}
      />
      <ClosingCta words={closing} />
      {location.visible && frame.contact ? (
        <HomeLocation header={headers.location} contact={frame.contact} />
      ) : null}
    </>
  );
}
