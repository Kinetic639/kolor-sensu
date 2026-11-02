import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SpecialistArtwork } from "@repo/ui/public-site";
import { getHomeSections, getSpecialists } from "@/lib/public-data";
import { toSpotlight } from "@/lib/spotlight";
import styles from "./preview.module.css";

export const metadata: Metadata = {
  title: "Warianty tła specjalisty — Kolor Sensu",
  robots: { index: false, follow: false },
};

const variants = [
  ["06b", "Wariant 06 bez górnego wcięcia"],
  ["06", "Poprawiona faktura pędzla"],
  ["01", "Miękki obrys ramion"],
  ["02", "Asymetryczna plama"],
  ["03", "Lekko przechylona kompozycja"],
  ["04", "Łagodne pociągnięcia"],
  ["05", "Lekki, nieregularny obrys"],
] as const;

export default async function SpecialistBackgroundPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const [sections, specialists] = await Promise.all([
    getHomeSections(),
    getSpecialists(),
  ]);
  const spotlight = toSpotlight(sections, specialists);
  if (!spotlight)
    return <p>Włącz prezentację specjalisty, aby zobaczyć podgląd.</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p>Pracownia tła</p>
        <h1>Malowane tło portretu</h1>
        <p>
          Ten sam portret i efekt przenikania. Pod każdym podglądem możesz
          zobaczyć samą grafikę.
        </p>
      </header>
      <div className={styles.grid}>
        {variants.map(([number, title]) => {
          const src = `/watercolor/specialist-variant-${number}.webp`;
          return (
            <article className={styles.variant} key={number}>
              <h2>
                {number}. {title}
              </h2>
              <div
                className={`ks-sp ${styles.art} ${number === "06b" ? styles.raised : ""}`}
              >
                <SpecialistArtwork
                  portraitSrc={spotlight.specialist.portraitSrc}
                  portraitAlt={
                    spotlight.specialist.portraitAlt ??
                    spotlight.specialist.name
                  }
                  splash="sage-1"
                  backdropSrc={src}
                  sizes="(min-width: 64rem) 350px, 85vw"
                />
              </div>
              <details>
                <summary>Zobacz samo tło</summary>
                <Image
                  src={src}
                  alt={`Tło: ${title}`}
                  width={450}
                  height={600}
                  className={styles.raw}
                />
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
