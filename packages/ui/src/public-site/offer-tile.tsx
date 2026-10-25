import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { PageLink as Link } from "./page-link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";
import { offerMatte } from "./offer-brush-matte.data";
import type { OfferMatteVariant } from "./offer-brush-matte";
import { OfferReveal } from "./offer-reveal";
import type { ReducedMotionMode } from "./watercolor-reveal";

// Server-safe on purpose: no hooks, no browser APIs, no "use client". The
// finished tile is the server HTML:
//
//   .ks-of                 positioned root, 5 : 8, the link's click area
//   ├── .ks-of__paint      the supplied watercolor patch: its painted area
//   │                      fills the tile (frames measured by the generator,
//   │                      so the four different files line up)
//   ├── .ks-of__content    icon (paper-coloured, as if cut out of the
//   │                      paint), title (the link), description
//   └── .ks-of__arrow      round arrow
//
// Without an href the tile is not a link (a fact, not a page): the title is
// plain text and there is no arrow. The icon is optional too.
//
// The optional entrance animation (animationPreset="brush-reveal") wraps
// the same markup in a small client component, OfferReveal: the patch is
// painted in five quick brush strokes at the angle of its brushwork (top to
// bottom, or bottom to top for variant "b"), then the content and the arrow
// arrive. It ends on exactly this
// static tile.

export type OfferPaint = keyof typeof offerMatte.paints;
export interface OfferService {
  title: string;
  description?: string;
  /** Where the tile leads; without it the tile is not a link. */
  href?: string;
  /** A line icon (lucide), drawn in paper colour: cut out of the paint. */
  icon?: ReactNode;
  /** Which supplied watercolor patch sits behind the tile. */
  paint: OfferPaint;
}

export interface OfferTileProps extends OfferService {
  /**
   * Entrance animation, played once when the tile comes into view (about
   * 0.9 s). "none" (default) renders the static tile only.
   */
  animationPreset?: "none" | "brush-reveal";
  /** Reduced motion: finished tile at once ("static") or a short fade. */
  reducedMotionMode?: ReducedMotionMode;
  /**
   * "a": top to bottom, first stroke left to right; "b": the opposite,
   * bottom to top, first stroke right to left.
   */
  matte?: OfferMatteVariant;
  /** Extra wait (s) before the reveal, to stagger a row of tiles. */
  revealDelay?: number;
  as?: "article" | "div" | "li";
  headingLevel?: "h2" | "h3" | "h4";
  sizes?: string;
  className?: string;
}

// The patch's painted area (fractions of its file) stretched onto the tile.
function frameStyle(paint: OfferPaint): CSSProperties {
  const [left, top, right, bottom] = offerMatte.paints[paint].frame;
  const width = right - left;
  const height = bottom - top;
  const percent = (value: number) => `${Math.round(value * 1e4) / 100}%`;
  return {
    left: percent(-left / width),
    top: percent(-top / height),
    width: percent(1 / width),
    height: percent(1 / height),
  };
}

export function OfferTile({
  title,
  description,
  href,
  icon,
  paint,
  animationPreset = "none",
  reducedMotionMode = "static",
  matte = "a",
  revealDelay = 0,
  as: Root = "article",
  headingLevel: Heading = "h3",
  sizes = "(min-width: 48rem) 14rem, 45vw",
  className,
}: OfferTileProps) {
  const classes = cn("ks-of group/of", className);
  const content = (
    <>
      <div className="ks-of__paint" aria-hidden="true">
        <div className="ks-of__paint-frame" style={frameStyle(paint)}>
          <Image
            src={offerMatte.paints[paint].src}
            alt=""
            fill
            sizes={sizes}
            loading="lazy"
          />
        </div>
      </div>
      <div className="ks-of__content">
        {icon ? (
          <span aria-hidden="true" className="ks-of__icon">
            {icon}
          </span>
        ) : null}
        <Heading className="ks-of__title font-body text-ink text-balance">
          {href ? (
            <Link
              href={href}
              className="after:rounded-card-lg focus-visible:after:outline-ring after:absolute after:inset-0 after:z-10 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </Heading>
        {description ? (
          <p className="ks-of__description text-ink/80 text-balance">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <span
          aria-hidden="true"
          className="ks-of__arrow rounded-button bg-surface text-ink shadow-card ease-soft group-hover/of:shadow-card-hover grid place-items-center transition-shadow duration-300"
        >
          <ArrowRight
            className="ease-soft size-4 transition-transform duration-200 group-hover/of:translate-x-0.5"
            strokeWidth={1.75}
          />
        </span>
      ) : null}
    </>
  );

  return animationPreset === "brush-reveal" ? (
    <OfferReveal
      as={Root}
      matte={matte}
      reducedMotionMode={reducedMotionMode}
      delay={revealDelay}
      className={classes}
    >
      {content}
    </OfferReveal>
  ) : (
    <Root className={classes}>{content}</Root>
  );
}
