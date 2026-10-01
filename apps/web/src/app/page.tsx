import {
  CrisisBand,
  DriftingPhotos,
  DriftingWords,
  FaqSection,
  HeroSection,
  OfferSection,
  PageMotion,
  PaintedStory,
  PriceNotes,
  SlotPicks,
  SpecialistsSection,
  TopicGuide,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import {
  crisis,
  faq,
  hero,
  offerCopy,
  pricesCopy,
  rooms,
  roomsStripCopy,
  slotsCopy,
  specialistsCopy,
  story,
  topics,
  topicsCopy,
  workshops,
} from "@/content/site";
import { withHomeContent } from "@/lib/home-content";
import { nearestSlotPicks, priceNotes } from "@/lib/home-sections";
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

/** The rooms' own photos first, then the site's, five at least. */
function stripPhotos(own: Array<{ src: string; alt: string }>) {
  const photos = [...own];
  for (const image of [hero.image, rooms.image, workshops.image]) {
    if (photos.length >= 5) break;
    if (!photos.some((photo) => photo.src === image.src)) photos.push(image);
  }
  return photos;
}

export default async function Home() {
  const [homeContent, services, specialists, roomGroups, slots, prices] =
    await Promise.all([
      getHomeContent(),
      getServices(),
      getSpecialists(),
      getRoomsByLocation(),
      nearestSlotPicks(),
      priceNotes(),
    ]);
  const roomPhotos = roomStripPhotos(roomGroups);

  return (
    <PageMotion>
      <HeroSection
        {...withHomeContent(hero, homeContent)}
        animationPreset="watercolor-reveal"
      />
      <TopicGuide id="z-czym-przychodzisz" {...topicsCopy} topics={topics} />
      {services.length > 0 ? (
        <OfferSection
          {...offerCopy}
          services={services.slice(0, 4).map(toOfferTile)}
          cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
          animationPreset="brush-reveal"
        />
      ) : null}
      <PaintedStory
        eyebrow={story.eyebrow}
        heading={story.heading}
        steps={story.steps.map((step, index) =>
          index === 1 && roomPhotos[0]
            ? { ...step, image: roomPhotos[0] }
            : step,
        )}
      />
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
      <DriftingPhotos {...roomsStripCopy} photos={stripPhotos(roomPhotos)} />
      {slots.length > 0 ? <SlotPicks {...slotsCopy} slots={slots} /> : null}
      {prices.length > 0 ? (
        <PriceNotes {...pricesCopy} prices={prices} />
      ) : null}
      <FaqSection
        items={faq}
        description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
        cta={{ href: "/kontakt", label: "Masz inne pytanie? Napisz do nas" }}
      />
      <CrisisBand {...crisis} className="mb-section-sm" />
      <ClosingCta />
    </PageMotion>
  );
}
