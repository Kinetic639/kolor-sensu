import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  EditorialHeading,
  SectionEyebrow,
  HanddrawnLink,
  WatercolorImage,
} from "@repo/ui/public-site";
import { getHomeStory, getWatercolorLook } from "@/lib/public-data";
import { educationStorySteps } from "@/features/education/home-story";
import { storyImages } from "@/content/site";
import styles from "./preview.module.css";
export const metadata: Metadata = {
  title: "Edukacja — podgląd kompozycji",
  robots: { index: false, follow: false },
};
/** The local comparison uses the same resolution and compositions as home. */
export default async function EducationCompositionPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const [story, watercolor] = await Promise.all([
    getHomeStory(),
    getWatercolorLook(),
  ]);
  const steps = await educationStorySteps(story, storyImages, watercolor);
  const ids = ["artykuly", "ebooki", "warsztaty"];
  const labels = ["Artykuły", "E-booki", "Warsztaty"];
  return (
    <div className={styles.preview}>
      <header className={styles.intro}>
        <SectionEyebrow className="text-primary-strong">
          Pracownia pomysłów · Edukacja
        </SectionEyebrow>
        <EditorialHeading as="h1" size="h2" accent="wspiera na co dzień.">
          Wiedza, która
        </EditorialHeading>
        <p>
          Kompozycje do porównania, oparte na opublikowanych materiałach strony.
          Warsztaty na DEV mają treści testowe.
        </p>
        <nav className={styles.navigation} aria-label="Kompozycje edukacji">
          {steps.map((_, i) => (
            <a key={i} href={`#${ids[i] ?? `slajd-${i + 1}`}`}>
              <span>0{i + 1}</span>
              {labels[i] ?? `Slajd ${i + 1}`}
            </a>
          ))}
        </nav>
      </header>
      {steps.map((step, i) => (
        <section
          className={styles.scene}
          id={ids[i] ?? `slajd-${i + 1}`}
          key={i}
          aria-labelledby={`preview-slide-${i}`}
        >
          <div className={styles.copy}>
            <p className={styles.count}>
              <span>0{i + 1}</span> / {String(steps.length).padStart(2, "0")}
            </p>
            <SectionEyebrow className="text-primary-strong">
              {labels[i] ?? "Edukacja"}
            </SectionEyebrow>
            <EditorialHeading id={`preview-slide-${i}`}>
              {step.heading}
            </EditorialHeading>
            <p className={styles.description}>{step.text}</p>
            {step.cta ? (
              <HanddrawnLink href={step.cta.href}>
                {step.cta.label}
              </HanddrawnLink>
            ) : null}
          </div>
          <div className={styles.composition}>
            {step.content ?? (
              <WatercolorImage {...step.image} {...watercolor} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
