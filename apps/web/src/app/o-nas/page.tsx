import {
  FeatureSection,
  PastelIconTile,
  SpecialistsSection,
} from "@repo/ui/public-site";
import { HeartHandshake, ShieldCheck, Sprout } from "lucide-react";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { about, hero, rooms, specialistsCopy } from "@/content/site";
import { toSpecialistCard } from "@/lib/presentation";
import { getCenter, getSpecialists } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "O nas",
  description:
    "Kolor Sensu to zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.",
  alternates: { canonical: "/o-nas" },
};

const valueIcons = [
  <ShieldCheck key="0" />,
  <Sprout key="1" />,
  <HeartHandshake key="2" />,
];
const valueTones = ["sage", "blush", "cream"] as const;

export default async function AboutPage() {
  const [center, specialists] = await Promise.all([
    getCenter(),
    getSpecialists(),
  ]);

  return (
    <>
      <PageIntro
        trail={[{ label: "O nas" }]}
        eyebrow={hero.eyebrow}
        heading={about.heading}
        accent={about.accent}
        lead={center?.shortDescription ?? about.lead}
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        <h2 className="sr-only">Nasze wartości</h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {about.values.map((value, index) => (
            <li key={value.title}>
              <PastelIconTile
                icon={valueIcons[index]}
                title={value.title}
                description={value.text}
                tone={valueTones[index % valueTones.length]}
              />
            </li>
          ))}
        </ul>
      </section>
      <FeatureSection
        {...rooms}
        cta={{ href: "/gabinety", label: "Zobacz nasze gabinety" }}
        imagePosition="left"
        animationPreset="watercolor-reveal"
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
      <ClosingCta />
    </>
  );
}
