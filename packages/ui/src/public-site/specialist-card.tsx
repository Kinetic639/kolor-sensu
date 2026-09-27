import type { ImageProps } from "next/image";
import { cn } from "../lib/utils";
import {
  type SpecialistSplash,
  SpecialistArtwork,
  splashAccent,
} from "./specialist-artwork";
import { SpecialistInfoPlate } from "./specialist-info-plate";
import { SpecialistReveal } from "./specialist-reveal";
import type { SplashMatteVariant } from "./specialist-splash-matte";
import type { ReducedMotionMode } from "./watercolor-reveal";

// Server-safe on purpose: no hooks, no browser APIs, no "use client". The
// finished card is the server HTML:
//
//   .ks-sp                     positioned root, the link's click area
//   ├── .ks-sp__art            splash + portrait (SpecialistArtwork)
//   └── .ks-sp__plate          name, role, arrow (SpecialistInfoPlate)
//
// The optional entrance animation (animationPreset="splash-reveal") wraps
// the same markup in a small client component, SpecialistReveal: the
// portrait lifts in, the splash blooms outward from behind the torso, the
// plate arrives last. It ends on exactly this static card.

export interface Specialist {
  name: string;
  role: string;
  href: string;
  /** Cut-out portrait (transparent background), head and shoulders. */
  portraitSrc: ImageProps["src"];
  /** Defaults to "Name, role". */
  portraitAlt?: string;
  /** Which supplied watercolor splash sits behind the portrait. */
  splash: SpecialistSplash;
}

export interface SpecialistWatercolorCardProps extends Specialist {
  /**
   * Entrance animation, played once when the card comes into view (about
   * 1.05 s). "none" (default) renders the static card only.
   */
  animationPreset?: "none" | "splash-reveal";
  /** Reduced motion: finished card at once ("static") or a short fade. */
  reducedMotionMode?: ReducedMotionMode;
  /** Bloom layout: "b" is "a" mirrored, so neighbouring cards differ. */
  matte?: SplashMatteVariant;
  /** Extra wait (s) before the reveal, to stagger a row of cards. */
  revealDelay?: number;
  as?: "article" | "div" | "li";
  headingLevel?: "h2" | "h3" | "h4";
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function SpecialistWatercolorCard({
  name,
  role,
  href,
  portraitSrc,
  portraitAlt,
  splash,
  animationPreset = "none",
  reducedMotionMode = "static",
  matte = "a",
  revealDelay = 0,
  as: Root = "article",
  headingLevel,
  sizes = "(min-width: 768px) 18rem, 20rem",
  priority,
  className,
}: SpecialistWatercolorCardProps) {
  const accent = splashAccent(splash);
  const classes = cn("ks-sp group/sp", className);
  const content = (
    <>
      <SpecialistArtwork
        portraitSrc={portraitSrc}
        portraitAlt={portraitAlt ?? `${name}, ${role.toLowerCase()}`}
        splash={splash}
        sizes={sizes}
        priority={priority}
      />
      <SpecialistInfoPlate
        name={name}
        role={role}
        href={href}
        accent={accent}
        headingLevel={headingLevel}
      />
    </>
  );

  return animationPreset === "splash-reveal" ? (
    <SpecialistReveal
      as={Root}
      matte={matte}
      reducedMotionMode={reducedMotionMode}
      delay={revealDelay}
      className={classes}
    >
      {content}
    </SpecialistReveal>
  ) : (
    <Root className={classes}>{content}</Root>
  );
}
