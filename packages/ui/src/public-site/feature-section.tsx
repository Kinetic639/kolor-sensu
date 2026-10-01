import type { ImageProps } from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { EditorialHeading, SectionEyebrow } from "./typography";
import { WatercolorImage, type WatercolorImageProps } from "./watercolor-image";

// Server-safe on purpose: no hooks, no browser APIs, no "use client". A
// painted picture beside a short intro (reference A: "Nasze gabinety",
// "Warsztaty i rozwój"):
//
//   intro     eyebrow, heading, copy, one "read more" link
//   picture   WatercolorImage, optionally painted in when it comes into view
//
// The intro always comes first in the markup, so the heading is read before
// the picture; `imagePosition` only moves the picture to the left or right
// on wide screens. On phones the intro is above the picture either way.

export interface FeatureSectionProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  cta?: { href: string; label: ReactNode };
  image: {
    src: ImageProps["src"];
    alt: string;
    caption?: ReactNode;
    objectPosition?: string;
  };
  /** Which side the picture sits on from 64 rem up. */
  imagePosition?: "left" | "right";
  /** The picture's entrance animation (WatercolorImage). */
  animationPreset?: WatercolorImageProps["animationPreset"];
  reducedMotionMode?: WatercolorImageProps["reducedMotionMode"];
  headingLevel?: "h2" | "h3";
  id?: string;
  className?: string;
}

export function FeatureSection({
  eyebrow,
  heading,
  description,
  cta,
  image,
  imagePosition = "left",
  animationPreset = "none",
  reducedMotionMode,
  headingLevel = "h2",
  id,
  className,
}: FeatureSectionProps) {
  return (
    <section
      id={id}
      data-image-position={imagePosition}
      className={cn(
        // Wide column gap: the watercolor overflows the image's box by about
        // 9 % of its width, and must not run into the text beside it.
        "max-w-page px-gutter py-section-sm mx-auto grid items-center gap-10 lg:grid-cols-2 lg:gap-x-20",
        className,
      )}
    >
      <div className="grid gap-4">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <EditorialHeading as={headingLevel} size="h2">
          {heading}
        </EditorialHeading>
        {description ? (
          <p className="max-w-copy text-body text-text-muted">{description}</p>
        ) : null}
        {cta ? (
          <ArrowLink href={cta.href} className="justify-self-start">
            {cta.label}
          </ArrowLink>
        ) : null}
      </div>
      <WatercolorImage
        src={image.src}
        alt={image.alt}
        caption={image.caption}
        objectPosition={image.objectPosition}
        animationPreset={animationPreset}
        reducedMotionMode={reducedMotionMode}
        // The layers are about 1.17x the box (the watercolor overflows it).
        sizes="(min-width: 1024px) 59vw, 117vw"
        className={cn(imagePosition === "left" && "lg:order-first")}
      />
    </section>
  );
}
