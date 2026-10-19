import {
  FeatureSection,
  PastelIconTile,
  SpecialistsSection,
} from "@repo/ui/public-site";
import { Check, HeartHandshake, ShieldCheck, Sprout } from "lucide-react";
import type { Metadata } from "next";
import { AboutAudiences, AboutStory } from "@/components/about-sections";
import { ClosingCta } from "@/components/closing-cta";
import { HomeLocation } from "@/components/home-location";
import { PageIntro } from "@/components/page-intro";
import { rooms } from "@/content/site";
import { toSpecialistCard } from "@/lib/presentation";
import {
  getAboutHeaders,
  getAboutPage,
  getCenter,
  getClosingCta,
  getSpecialists,
  getWatercolorLook,
} from "@/lib/public-data";
import { pageMetadata } from "@/lib/page-metadata";
import { getSiteFrame } from "@/lib/site-frame";

// O nas, top to bottom (the sections agreed on 16.10): the centre's
// title and description, "Nasza historia", the three values (with the
// concrete facts under the last one), "Z kim pracujemy", the team, the
// rooms, where we are, and the closing banner. Every word is the CMS's
// (CMS → O nas); the history, the facts and "Z kim pracujemy" show only
// once the admin switches them on, and "Kontakt" only with the company's
// details.

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("about");
}

/** The lead when neither the CMS nor Ustawienia have one. */
const DEFAULT_LEAD =
  "Kolor Sensu to miejsce, w którym można zatrzymać się, poukładać myśli i znaleźć wsparcie. Tworzymy zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.";

const valueIcons = [
  <ShieldCheck key="0" />,
  <Sprout key="1" />,
  <HeartHandshake key="2" />,
];
const valueTones = ["sage", "blush", "cream"] as const;

export default async function AboutPage() {
  const [about, headers, center, specialists, watercolor, frame, closing] =
    await Promise.all([
      getAboutPage(),
      getAboutHeaders(),
      getCenter(),
      getSpecialists(),
      getWatercolorLook(),
      getSiteFrame(),
      getClosingCta(),
    ]);
  const { intro } = about;
  const facts = about.showProfessionalism ? about.professionalism : [];
  const story = about.story.text.trim();

  return (
    <>
      <PageIntro
        eyebrow={intro.eyebrow || undefined}
        heading={intro.heading}
        accent={intro.accent || undefined}
        lead={intro.lead || center?.shortDescription || DEFAULT_LEAD}
      />
      {about.showStory && story ? (
        <AboutStory
          header={headers.story}
          image={
            about.storyImageUrl
              ? { src: about.storyImageUrl, alt: about.story.imageAlt }
              : null
          }
          text={story}
        />
      ) : null}
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        <h2 className="sr-only">Nasze wartości</h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {about.values.map((value, index) => (
            <li className="grid content-start gap-4" key={index}>
              <PastelIconTile
                icon={valueIcons[index]}
                title={value.title}
                description={value.text}
                tone={valueTones[index % valueTones.length]}
              />
              {/* The concrete facts, under the last card ("Profesjonalizm"). */}
              {index === about.values.length - 1 && facts.length > 0 ? (
                <ul
                  aria-label={`${value.title}: konkretnie`}
                  className="text-body grid gap-2 px-2"
                >
                  {facts.map((fact) => (
                    <li className="flex gap-2" key={fact}>
                      <Check
                        aria-hidden="true"
                        className="text-primary mt-1 size-4 shrink-0"
                      />
                      {fact}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      {about.showAudiences ? (
        <AboutAudiences
          audiences={about.audiences}
          header={headers.audiences}
          note={about.audiencesNote}
        />
      ) : null}
      {specialists.length > 0 ? (
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
        watercolor={watercolor}
      />
      {frame.contact ? (
        <HomeLocation contact={frame.contact} header={headers.contact} />
      ) : null}
      <ClosingCta words={closing} />
    </>
  );
}
