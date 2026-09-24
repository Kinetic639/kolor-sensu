import Image, { type ImageProps } from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";
import {
  BotanicalAccent,
  type BotanicalAccentVariant,
} from "./botanical-accent";

// Server-safe on purpose: no hooks, no browser APIs, no "use client". The
// painted look is CSS (SVG alpha masks + token colours), so the server HTML
// already contains the finished picture with its <img> and alt text.
// Animation is layered on from outside (PaintReveal / paint="on-load").

export const watercolorShapes = [
  "soft-horizontal",
  "wide-brush",
  "portrait-soft",
  "compact-brush",
] as const;
export type WatercolorShape = (typeof watercolorShapes)[number];

export const watercolorTones = [
  "sage",
  "blush",
  "sage-blush",
  "neutral",
] as const;
export type WatercolorTone = (typeof watercolorTones)[number];

export type WatercolorAccentPosition =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type WatercolorCaptionPosition =
  "top-right" | "bottom-right" | "bottom-left";

// Sensible defaults per shape so a caller only has to pass `sizes` when the
// image sits in an unusual column.
const defaultSizes: Record<WatercolorShape, string> = {
  "soft-horizontal": "(min-width: 1024px) 50vw, 100vw",
  "wide-brush": "(min-width: 1024px) 60vw, 100vw",
  "portrait-soft": "(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 80vw",
  "compact-brush": "(min-width: 1024px) 20vw, 45vw",
};

export interface WatercolorImageProps {
  src: ImageProps["src"];
  /**
   * Required. Describe the photo; pass "" only when the image is purely
   * decorative (the surrounding text already says everything).
   */
  alt: string;
  /** Brushed silhouette. Pick by crop: wide hero, landscape room, portrait. */
  shape?: WatercolorShape;
  /** Which pastel washes sit behind the photo. */
  tone?: WatercolorTone;
  /** Box ratio, e.g. "16 / 9" or 1.5. Defaults to the shape's native ratio. */
  aspectRatio?: string | number;
  /** CSS object-position for the crop, e.g. "30% 40%" to keep a face in. */
  focalPoint?: string;
  /** Responsive `sizes` for next/image. */
  sizes?: string;
  /** Above-the-fold hero: preload with high fetch priority, never lazy. */
  priority?: boolean;
  quality?: number;
  /** Hide the pastel washes (e.g. inside a card that already has colour). */
  washes?: boolean;
  /** Optional botanical line art drawn over the edge of the frame. */
  accent?: BotanicalAccentVariant;
  accentPosition?: WatercolorAccentPosition;
  /** Optional handwritten overlay, rendered as real text in <figcaption>. */
  caption?: ReactNode;
  captionPosition?: WatercolorCaptionPosition;
  /** "light" sits on the photo (with a soft veil); "ink" sits on paper. */
  captionTone?: "light" | "ink";
  /**
   * "on-load" plays the paint sequence once with CSS only (for the hero).
   * For below-the-fold images wrap in <PaintReveal> instead.
   */
  paint?: "none" | "on-load";
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
}

export function WatercolorImage({
  src,
  alt,
  shape = "soft-horizontal",
  tone = "sage-blush",
  aspectRatio,
  focalPoint,
  sizes,
  priority = false,
  quality,
  washes = true,
  accent,
  accentPosition = "top-right",
  caption,
  captionPosition = "bottom-right",
  captionTone = "light",
  paint = "none",
  className,
  imageClassName,
  style,
}: WatercolorImageProps) {
  const Root = caption ? "figure" : "div";
  const rootStyle = {
    ...(aspectRatio !== undefined && { "--ks-wc-ratio": String(aspectRatio) }),
    ...(focalPoint && { "--ks-wc-focus": focalPoint }),
    ...style,
  } as CSSProperties;

  return (
    <Root
      className={cn("ks-wc", `ks-wc--${shape}`, `ks-wc--${tone}`, className)}
      data-shape={shape}
      data-tone={tone}
      data-paint={paint === "on-load" ? "load" : undefined}
      style={rootStyle}
    >
      {washes ? (
        <>
          <span className="ks-wc__wash ks-wc__wash--back" aria-hidden="true" />
          <span className="ks-wc__wash ks-wc__wash--front" aria-hidden="true" />
        </>
      ) : null}
      <div className="ks-wc__frame">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? defaultSizes[shape]}
          quality={quality}
          preload={priority}
          loading={priority ? undefined : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className={cn("ks-wc__img", imageClassName)}
        />
      </div>
      {accent ? (
        <BotanicalAccent
          variant={accent}
          className={cn("ks-wc__accent", `ks-wc__accent--${accentPosition}`)}
        />
      ) : null}
      {caption ? (
        <figcaption
          className={cn(
            "ks-wc__caption",
            `ks-wc__caption--${captionPosition}`,
            `ks-wc__caption--${captionTone}`,
          )}
        >
          {caption}
          <BrushUnderline />
        </figcaption>
      ) : null}
    </Root>
  );
}

// Dry-brush swash under the handwritten caption (reference B).
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
