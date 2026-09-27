import Image, { type ImageProps } from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";
import { CaptionMotion } from "./watercolor-caption-motion";
import { type ReducedMotionMode, WatercolorReveal } from "./watercolor-reveal";

// Server-safe on purpose: no hooks, no browser APIs, no "use client" here.
// The painted look is a static composition of two layers, so the server
// HTML is already the finished picture:
//
//   .ks-wc                    stable aspect-ratio box (3 / 2 by default): the
//   │                         solid part of the painted photo
//   ├── .ks-wc__backdrop      the watercolor asset, decorative, overflowing
//   │                         the box on every side (so does the photo's
//   │                         brushed fringe); keep an overflow-x: clip
//   │                         ancestor, as the page's <main> is
//   ├── .ks-wc__photo         the uploaded photo, cropped with object-fit:
//   │                         cover and cut by the dry-brush photo mask
//   └── .ks-wc__caption       optional handwritten overlay (real text),
//                             its own tiny client island (CaptionMotion:
//                             watercolor-caption-motion.tsx) for a discreet
//                             idle float and a few pixels of scroll
//                             parallax; present with or without the
//                             entrance animation below.
//
// The optional entrance animation (animationPreset="watercolor-reveal")
// wraps the same layers in a small client component, WatercolorReveal, that
// reveals them through a matte: the backdrop painted in with brush strokes
// from both sides, the photo spreading in blooms from its middle while the
// backdrop is still being painted. It ends on exactly this static
// composition.

/** The approved painted backdrop: dusty pink left, sage green right. */
export const defaultWatercolorSrc = "/watercolor/watercolor-background.webp";

export interface WatercolorImageProps {
  /**
   * Any ordinary rectangular photo, as uploaded. The component crops and
   * masks it; the file itself never needs editing.
   */
  src: ImageProps["src"];
  /**
   * Required. Describe the photo; pass "" only when the image is purely
   * decorative (the surrounding text already says everything).
   */
  alt: string;
  /** Painted backdrop behind the photo. `null` leaves it out. */
  watercolorSrc?: ImageProps["src"] | null;
  /**
   * Ratio of the component's box (the photo; the watercolor overflows it).
   * The mask and the backdrop are drawn for 3 / 2 (the default); ratios up
   * to about 2 / 1 still look right.
   */
  aspectRatio?: string;
  /**
   * Which part of the photo stays in frame, as CSS object-position
   * (e.g. "52% 44%" to keep a face or the main subject in view).
   */
  objectPosition?: string;
  /** Responsive `sizes` for next/image (both layers). */
  sizes?: string;
  /** Above-the-fold hero: preload with high fetch priority, never lazy. */
  priority?: boolean;
  quality?: number;
  /** Optional handwritten overlay, rendered as real text in <figcaption>. */
  caption?: ReactNode;
  /**
   * Entrance animation, played once when the image comes into view: the
   * backdrop is painted in with brush strokes from both sides, the photo
   * spreads in blooms from its middle outward, then the caption appears
   * (about 1.15 s). "none"
   * (default) renders the static composition only.
   */
  animationPreset?: "none" | "watercolor-reveal";
  /**
   * What the entrance animation does for visitors who prefer reduced
   * motion: show the finished composition at once ("static", default) or
   * fade it in briefly ("simple-fade").
   */
  reducedMotionMode?: ReducedMotionMode;
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
}

export function WatercolorImage({
  src,
  alt,
  watercolorSrc = defaultWatercolorSrc,
  aspectRatio,
  objectPosition = "50% 50%",
  // The layers are about 1.17x the box (the watercolor overflows it).
  sizes = "(min-width: 1024px) 70vw, 117vw",
  priority = false,
  quality,
  caption,
  animationPreset = "none",
  reducedMotionMode = "static",
  className,
  imageClassName,
  style,
}: WatercolorImageProps) {
  const Root = caption ? "figure" : "div";
  const loading = priority ? undefined : "lazy";
  const rootProps = {
    className: cn("ks-wc", className),
    style: {
      ...(aspectRatio && { "--ks-wc-ratio": aspectRatio }),
      ...style,
    } as CSSProperties,
  };
  const layers = (
    <>
      {watercolorSrc ? (
        <div className="ks-wc__backdrop" aria-hidden="true">
          <Image
            src={watercolorSrc}
            alt=""
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      ) : null}
      <div className="ks-wc__photo">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          preload={priority}
          loading={loading}
          fetchPriority={priority ? "high" : undefined}
          className={cn("ks-wc__img", imageClassName)}
          style={{ objectPosition }}
        />
      </div>
      {caption ? (
        <CaptionMotion>
          {caption}
          <BrushUnderline />
        </CaptionMotion>
      ) : null}
    </>
  );

  return animationPreset === "watercolor-reveal" ? (
    <WatercolorReveal
      as={Root}
      reducedMotionMode={reducedMotionMode}
      {...rootProps}
    >
      {layers}
    </WatercolorReveal>
  ) : (
    <Root {...rootProps}>{layers}</Root>
  );
}

// Dry-brush swash under the handwritten caption.
function BrushUnderline() {
  return (
    <svg
      className="ks-wc__underline"
      viewBox="0 0 240 22"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 17.5C46 11 118 6.2 236 5.2C238 5.4 238 6.6 236 7C150 9.4 82 13.4 9 20.4C4.6 20.9 1.4 18.6 3 17.5Z" />
      <path
        d="M58 14.6C100 11.4 150 9.6 205 9.2C160 11.2 110 13.4 62 16.2Z"
        opacity="0.55"
      />
    </svg>
  );
}
