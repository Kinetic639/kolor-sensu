import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircularWatercolorImage, HanddrawnLink } from "@repo/ui/public-site";
import { getRoomsByLocation } from "@/lib/public-data";
import styles from "./preview.module.css";
import { AnimationPreview } from "./animation-preview";

export const metadata: Metadata = {
  title: "Okrągłe zdjęcia — podgląd",
  robots: { index: false, follow: false },
};

export default async function CircularPhotoPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const rooms = await getRoomsByLocation();
  const photo = rooms.flatMap((group) =>
    group.rooms.flatMap((room) => room.photos),
  )[0];
  const image = {
    src: photo?.url ?? "/images/gabinet-fotel.webp",
    alt: photo?.alt ?? "Przytulny gabinet",
  };
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Pracownia detali</p>
        <h1>Okrągłe zdjęcia z malowanym tłem</h1>
        <p>
          Gęste smugi obracają się wokół wspólnego środka i pozostawiają
          odsłonięte fragmenty. Tło i zdjęcie pojawiają się równocześnie, w
          przeciwnych kierunkach.
        </p>
        <HanddrawnLink href="/">Wróć na stronę główną</HanddrawnLink>
        <p>
          <a href="/podglad-okraglych-zdjec?odtworz=1">
            Odtwórz animacje ponownie
          </a>
        </p>
      </header>
      <div className={styles.spiralGrid}>
        {(["clockwise", "counterclockwise"] as const).map((direction) => (
          <article key={direction} className={styles.item}>
            <AnimationPreview backgroundFrame={0.23} photoFrame={0.3}>
              <CircularWatercolorImage
                {...image}
                variant={1}
                rotation={18}
                circularPaint={{ variant: "star-trails", direction }}
                sizes="(min-width: 64rem) 440px, 85vw"
                animationPreset="watercolor-reveal"
              />
            </AnimationPreview>
            <h2>
              {direction === "clockwise"
                ? "Wirujące smugi — w prawo"
                : "Wirujące smugi — w lewo"}
            </h2>
            <p>
              Wiele cienkich śladów o różnych długościach. Odsłonięta farba
              zostaje na miejscu, kolejne obroty domalowują całość.
            </p>
          </article>
        ))}
      </div>
      <details className={styles.section}>
        <summary>Poprzednie próby animacji</summary>
        <div className={styles.grid}>
          {(["rings", "paired", "sweep"] as const).flatMap((motion, index) =>
            (["clockwise", "counterclockwise"] as const).map((direction) => (
              <article key={`${motion}-${direction}`} className={styles.item}>
                <AnimationPreview>
                  <CircularWatercolorImage
                    {...image}
                    variant={(index + 1) as 1 | 2 | 3}
                    circularPaint={{ variant: motion, direction, angle: 215 }}
                    rotation={[18, 137, 268][index]}
                    sizes="(min-width: 64rem) 380px, 85vw"
                    animationPreset="watercolor-reveal"
                  />
                </AnimationPreview>
                <h2>
                  {
                    ["Krótkie pociągnięcia", "Swobodne łuki", "Szerszy pędzel"][
                      index
                    ]
                  }
                </h2>
                <p>
                  {direction === "clockwise"
                    ? "Zgodnie ze wskazówkami zegara"
                    : "Przeciwnie do wskazówek zegara"}
                </p>
              </article>
            )),
          )}
        </div>
      </details>
      <section className={styles.section}>
        <h2>Jedno tło, różne kąty obrotu</h2>
        <p>Zmienia się ułożenie farby, zdjęcie zachowuje swoje położenie.</p>
        <div className={styles.grid}>
          {[0, 97, 236].map((rotation) => (
            <figure key={rotation} className={styles.item}>
              <CircularWatercolorImage
                {...image}
                variant={3}
                rotation={rotation}
                sizes="(min-width: 64rem) 380px, 85vw"
              />
              <figcaption>{rotation}°</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <h2>Sam brzeg fotografii</h2>
        <p>Podgląd bez kolorowego tła pozwala ocenić delikatność maski.</p>
        <div className={styles.edge}>
          <CircularWatercolorImage
            {...image}
            watercolorSrc={null}
            sizes="(min-width: 40rem) 560px, 85vw"
          />
        </div>
      </section>
    </div>
  );
}
