import type { ImageProps } from "next/image";
import { PageLink as Link } from "./page-link";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PrimaryButton, SecondaryButton } from "./actions";
import { type HeroPoint, HeroPoints } from "./hero-points";
import { EditorialHeading, SectionEyebrow } from "./typography";
import { WatercolorImage, type WatercolorImageProps } from "./watercolor-image";

// Server-safe on purpose: no hooks, no browser APIs, no "use client". The
// first screen of the homepage (reference A):
//
//   intro        eyebrow in dusty pink, the H1 with its second line in brand
//                green, lead copy, two actions, a row of reassurances
//   picture      WatercolorImage, its backdrop painted in with brush strokes
//                and its photo spreading in blooms when it first comes into
//                view (animationPreset="watercolor-reveal"), with
//                its handwritten caption
//
// Text first on phones, side by side from 64 rem, the picture reaching into
// the right margin.

export interface HeroAction {
  label: ReactNode;
  href: string;
}

export interface HeroSectionProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  /** The heading's second line, in brand green. */
  accent?: ReactNode;
  description?: ReactNode;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  points?: readonly HeroPoint[];
  image: {
    src: ImageProps["src"];
    alt: string;
    caption?: ReactNode;
    objectPosition?: string;
  };
  /** The picture's entrance animation (WatercolorImage). */
  animationPreset?: WatercolorImageProps["animationPreset"];
  reducedMotionMode?: WatercolorImageProps["reducedMotionMode"];
  id?: string;
  className?: string;
}

export function HeroSection({
  eyebrow,
  heading,
  accent,
  description,
  primaryAction,
  secondaryAction,
  points,
  image,
  animationPreset = "none",
  reducedMotionMode,
  id,
  className,
}: HeroSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "max-w-page px-gutter py-section-sm mx-auto grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]",
        className,
      )}
    >
      <div className="grid gap-6" data-motion="text">
        {eyebrow ? (
          // Pink text this small needs the strong step for contrast.
          <SectionEyebrow className="text-pink-strong">
            {eyebrow}
          </SectionEyebrow>
        ) : null}
        <EditorialHeading as="h1" accent={accent} accentTone="primary">
          {heading}
        </EditorialHeading>
        {description ? (
          <p className="max-w-copy text-lead text-text-muted">{description}</p>
        ) : null}
        {primaryAction || secondaryAction ? (
          <div className="flex flex-wrap gap-3">
            {primaryAction ? (
              <PrimaryButton asChild arrow>
                <Link href={primaryAction.href}>{primaryAction.label}</Link>
              </PrimaryButton>
            ) : null}
            {secondaryAction ? (
              <SecondaryButton asChild>
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </SecondaryButton>
            ) : null}
          </div>
        ) : null}
        {points?.length ? (
          <HeroPoints points={points} className="mt-4" />
        ) : null}
      </div>
      <WatercolorImage
        src={image.src}
        alt={image.alt}
        caption={image.caption}
        objectPosition={image.objectPosition}
        animationPreset={animationPreset}
        reducedMotionMode={reducedMotionMode}
        priority
        // The layers are about 1.17x the box (the watercolor overflows it).
        sizes="(min-width: 1024px) 65vw, 117vw"
        className="lg:-mr-12 xl:-mr-20"
      />
    </section>
  );
}
