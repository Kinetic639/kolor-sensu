import {
  FaqSection,
  FeatureSection,
  HeroSection,
  PaintedStory,
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
  specialistsCopy,
  story,
  supportAreasCopy,
  thoughts,
  workshops,
} from "@/content/site";
import { withHomeContent } from "@/lib/home-content";
import { toSpecialistCard } from "@/lib/presentation";
import {
  getHomeContent,
  getSpecialists,
  getSupportAreas,
} from "@/lib/public-data";
import { toSupportAreaItems } from "@/lib/support-areas";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [homeContent, supportAreas, specialists] = await Promise.all([
    getHomeContent(),
    getSupportAreas(),
    getSpecialists(),
  ]);

  return (
    <>
      <HeroSection
        {...withHomeContent(hero, homeContent)}
        animationPreset="watercolor-reveal"
      />
      <ThoughtsLens {...thoughts} />
      <SupportAreas
        {...supportAreasCopy}
        areas={toSupportAreaItems(
          supportAreas,
          defaultSupportAreas,
          bookingCta,
        )}
        cta={{ href: "/oferta", label: "Zobacz całą ofertę" }}
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
