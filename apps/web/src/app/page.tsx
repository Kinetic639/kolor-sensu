import {
  FaqSection,
  FeatureSection,
  HeroSection,
  OfferSection,
  PaintedStory,
  SpecialistsSection,
  ThoughtsLens,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import {
  faq,
  hero,
  offerCopy,
  rooms,
  specialistsCopy,
  story,
  thoughts,
  workshops,
} from "@/content/site";
import { withHomeContent } from "@/lib/home-content";
import { toOfferTile, toSpecialistCard } from "@/lib/presentation";
import { getHomeContent, getServices, getSpecialists } from "@/lib/public-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [homeContent, services, specialists] = await Promise.all([
    getHomeContent(),
    getServices(),
    getSpecialists(),
  ]);

  return (
    <>
      <HeroSection
        {...withHomeContent(hero, homeContent)}
        animationPreset="watercolor-reveal"
      />
      <ThoughtsLens {...thoughts} />
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
      <PaintedStory {...story} />
      <FeatureSection
        {...rooms}
        cta={{ href: "/gabinety", label: "Zobacz nasze gabinety" }}
        imagePosition="left"
        animationPreset="watercolor-reveal"
      />
      <FeatureSection
        {...workshops}
        cta={{ href: "/warsztaty", label: "Zobacz nadchodzące wydarzenia" }}
        imagePosition="right"
        animationPreset="watercolor-reveal"
      />
      <FaqSection
        items={faq}
        description="Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą."
        cta={{ href: "/kontakt", label: "Masz inne pytanie? Napisz do nas" }}
      />
      <ClosingCta />
    </>
  );
}
