import Image, { type ImageProps } from "next/image";
import type { CSSProperties } from "react";
import type { SpotlightFraming } from "@repo/contracts/cms";

// The organic, open visual of a specialist card. Server-safe: no hooks, no
// browser APIs. Three layers in one 3 : 4 box (the ratio of every splash
// asset, and the design space of the splash matte):
//
//   .ks-sp__art
//   ├── .ks-sp__splash         the supplied watercolor splash, whole: its
//   │                          own alpha is its final shape
//   └── .ks-sp__portrait       the cut-out portrait; its lower edge breaks
//       │                      up into the watercolor (portrait-dissolve.png)
//       ├── .ks-sp__portrait-frame
//       └── .ks-sp__stain      the same splash again, multiplied over the
//                              lower portrait in patches (portrait-stain
//                              .png): pigment soaking into the clothes
//
// All positions are percentages of the box (public-site.css), so the layers
// keep their relation at every size.

/** The supplied watercolor splash backgrounds. */
export const specialistSplashes = {
  "pink-1": "/watercolor/splash-pink-1.png",
  "pink-2": "/watercolor/splash-pink-2.png",
  "sage-1": "/watercolor/splash-sage-1.png",
  "sage-2": "/watercolor/splash-sage-2.png",
} as const;

export type SpecialistSplash = keyof typeof specialistSplashes;
export type SpecialistAccent = "pink" | "sage";

/** The order the site gives the splashes, specialist by specialist. */
const SPLASH_ORDER: SpecialistSplash[] = [
  "pink-1",
  "sage-1",
  "pink-2",
  "sage-2",
];

/**
 * The splash of the specialist at `index` on the site (the published, the
 * latest first); none (-1): the first.
 */
export function specialistSplashAt(index: number): SpecialistSplash {
  return SPLASH_ORDER[Math.max(0, index) % SPLASH_ORDER.length]!;
}

export function splashAccent(splash: SpecialistSplash): SpecialistAccent {
  return splash.startsWith("pink") ? "pink" : "sage";
}

export interface SpecialistArtworkProps {
  portraitSrc: ImageProps["src"];
  portraitAlt: string;
  splash: SpecialistSplash;
  /** Optional brush artwork, shared by the background and pigment overlay. */
  backdropSrc?: ImageProps["src"];
  portraitFraming?: SpotlightFraming;
  backgroundFraming?: SpotlightFraming;
  professionalHover?: boolean;
  sizes: string;
  priority?: boolean;
}

export function SpecialistArtwork({
  portraitSrc,
  portraitAlt,
  splash,
  backdropSrc,
  portraitFraming,
  backgroundFraming,
  professionalHover = false,
  sizes,
  priority = false,
}: SpecialistArtworkProps) {
  const loading = priority ? "eager" : "lazy";
  const splashImage = (
    <Image
      src={backdropSrc ?? specialistSplashes[splash]}
      alt=""
      fill
      sizes={sizes}
      loading={loading}
    />
  );
  const painted = (
    <>
      <div className="ks-sp__splash" aria-hidden="true">
        {splashImage}
      </div>
      <div className="ks-sp__portrait">
        <div className="ks-sp__portrait-frame">
          <Image
            src={portraitSrc}
            alt={portraitAlt}
            fill
            sizes={sizes}
            loading={loading}
            className="ks-sp__portrait-img"
          />
        </div>
        <div className="ks-sp__stain" aria-hidden="true">
          {splashImage}
        </div>
      </div>
    </>
  );
  const style = {
    "--ks-portrait-x": `${portraitFraming?.x ?? 0}%`,
    "--ks-portrait-y": `${portraitFraming?.y ?? 0}%`,
    "--ks-portrait-zoom": portraitFraming?.zoom ?? 1,
    "--ks-paint-x": `${backgroundFraming?.x ?? 0}%`,
    "--ks-paint-y": `${backgroundFraming?.y ?? 0}%`,
    "--ks-paint-zoom": backgroundFraming?.zoom ?? 1,
  } as CSSProperties;
  return (
    <div
      className={
        professionalHover ? "ks-sp__art ks-sp__art--professional" : "ks-sp__art"
      }
      style={style}
      tabIndex={professionalHover ? 0 : undefined}
    >
      {professionalHover ? (
        <>
          <div className="ks-sp__painted">{painted}</div>
          <div className="ks-sp__professional" aria-hidden="true">
            <div className="ks-sp__portrait-frame">
              <Image
                src={portraitSrc}
                alt=""
                fill
                sizes={sizes}
                loading={loading}
                className="ks-sp__portrait-img"
              />
            </div>
          </div>
        </>
      ) : (
        painted
      )}
    </div>
  );
}
