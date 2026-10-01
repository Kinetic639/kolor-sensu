import {
  DriftingPhotos,
  DriftingWords,
  FaqSection,
  HeroSection,
  OfferSection,
  PageMotion,
  PaintedStory,
  SpecialistsSection,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { faq, hero, offerCopy, specialistsCopy, story } from "@/content/site";
import { withHomeContent } from "@/lib/home-content";
import { toOfferTile, toSpecialistCard } from "@/lib/presentation";
import { roomStripPhotos } from "@/lib/rooms-by-location";
import {
  getHomeContent,
  getRoomsByLocation,
  getServices,
  getSpecialists,
} from "@/lib/public-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [homeContent, services, specialists, roomGroups] = await Promise.all([
    getHomeContent(),
    getServices(),
    getSpecialists(),
    getRoomsByLocation(),
  ]);
  const roomPhotos = roomStripPhotos(roomGroups);

  return (
    <PageMotion>
      <HeroSection
        {...withHomeContent(hero, homeContent)}
        animationPreset="watercolor-reveal"
      />
      {services.length > 0 ? (
        <OfferSection
          {...offerCopy}
          services={services.slice(0, 4).map(toOfferTile)}
          cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
          animationPreset="brush-reveal"
        />
      ) : null}
      {specialists.length > 0 ? (
        <SpecialistsSection
          {...specialistsCopy}
          specialists={specialists.slice(0, 3).map(toSpecialistCard)}
          cta={{
            href: "/specjalisci",
            label: "Zobacz wszystkich specjalistów",
          }}
          animationPreset="splash-reveal"
        />
      ) : null}
      <DriftingWords lines={["Spokojnie, uważnie,", "z sensem."]} />
      <PaintedStory
        eyebrow={story.eyebrow}
        heading={story.heading}
        steps={story.steps.map((step, index) =>
          index === 1 && roomPhotos[0]
            ? { ...step, image: roomPhotos[0] }
            : step,
        )}
      />
      {roomPhotos.length >= 3 ? (
        <DriftingPhotos photos={roomPhotos} cursorLabel="Gabinety" />
      ) : null}
      <FaqSection
        items={faq}
        description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
        cta={{ href: "/kontakt", label: "Masz inne pytanie? Napisz do nas" }}
      />
      <ClosingCta />
    </PageMotion>
  );
}
