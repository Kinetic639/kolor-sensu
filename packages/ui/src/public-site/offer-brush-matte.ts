import { gsap } from "gsap";
import { offerMatte } from "./offer-brush-matte.data";

// The brush matte of OfferTile's entrance animation: the tile's watercolor
// patch is painted in with five quick brush strokes, each running across
// the whole tile at the angle of the brushwork in the supplied patches
// (22°, rising to the right), back and forth, one band after another.
//
//   <mask>        referenced by mask-image: url(#…) on the paint layer
//     strokes     one image per stroke, cut from the atlas
//                 (offer-brush-matte.data.ts). Its alpha is the stroke's
//                 finished shape (opaque body, dry-brush edges, bristle
//                 hairs), its grey channel says when each pixel gets paint,
//                 along the brush path, the belly of the brush ahead.
//     filter      per stroke: shows the pixels whose time has come, with a
//                 crisp brush front, times the alpha.
//
// GSAP only schedules: one tween of the threshold per stroke, in painting
// order, each starting before the one before it has finished. The final shape is the
// supplied patch's own alpha: the strokes together cover the whole tile
// (the generator checks it), so dropping the matte changes nothing.
//
// Two variants, alternating in a row: "a" paints top to bottom, its first
// stroke left to right; "b" the opposite way, bottom to top, its first
// stroke right to left.

export type OfferMatteVariant = keyof typeof offerMatte.variants;

export interface OfferStroke {
  id: string;
  /** The stroke image, hidden until the brush sets down. */
  group: SVGGElement;
  /** Its paint threshold (the filter's colour matrix). */
  front: SVGFEColorMatrixElement;
}

export interface OfferMatte {
  svg: SVGSVGElement;
  mask: SVGMaskElement;
  /** mask-image value for the paint layer. */
  url: string;
  strokes: OfferStroke[];
}

/** When each part of the tile appears (s from the start of the reveal). */
export const offerRevealTiming = {
  strokes: { at: 0, gap: 0.11, duration: 0.3, ease: "power2.out" },
  content: { at: 0.3, duration: 0.45, lift: 8 },
  arrow: { at: 0.55, duration: 0.35, lift: 6 },
} as const;

/** Images the matte draws with; loaded before the reveal starts. */
export const offerMatteUrls = [offerMatte.atlas.src];

// A brush: the front cuts crisply, then frays into the bristle streaks that
// are in the time map.
export const STROKE_SHARPNESS = 110;

const SVG_NS = "http://www.w3.org/2000/svg";
let matteCount = 0;

// alpha = sharpness × (front − grey), in white; only the last number
// changes while a stroke is painted.
function strokeFront(front: number) {
  const offset = Math.round(STROKE_SHARPNESS * front * 1000) / 1000;
  return `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${-STROKE_SHARPNESS} 0 0 0 ${offset}`;
}

// Past both ends, so a stroke starts with no paint and ends with all of it.
const frontRange = [-1 / STROKE_SHARPNESS, 1 + 1 / STROKE_SHARPNESS] as const;

/**
 * Builds the brush matte (nothing painted yet) inside `host`. Mask the paint
 * layer with `matte.url`.
 */
export function createOfferMatte(
  host: Element,
  variant: OfferMatteVariant = "a",
): OfferMatte {
  const document = host.ownerDocument;
  const id = `ks-offer-matte-${++matteCount}`;
  const element = <K extends keyof SVGElementTagNameMap>(
    name: K,
    attributes: Record<string, string | number> = {},
  ) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, String(value));
    }
    return node;
  };

  const svg = element("svg", {
    class: "ks-of__matte",
    width: 0,
    height: 0,
    "aria-hidden": "true",
    focusable: "false",
  });
  const defs = element("defs");
  svg.append(defs);
  const mask = element("mask", {
    id,
    // Coverage only: the colour channels carry the time maps.
    "mask-type": "alpha",
    maskUnits: "objectBoundingBox",
    maskContentUnits: "objectBoundingBox",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const paint = element("g", {
    transform: `scale(${1 / offerMatte.width} ${1 / offerMatte.height})`,
  });
  mask.append(paint);
  defs.append(mask);

  const strokes = offerMatte.variants[variant].map((stroke): OfferStroke => {
    const [bx, by, bw, bh] = stroke.box;
    const [ax, ay, aw, ah] = stroke.atlas;
    const filter = element("filter", {
      id: `${id}-${stroke.id}`,
      filterUnits: "userSpaceOnUse",
      x: bx,
      y: by,
      width: bw,
      height: bh,
      // Read the grey channel as it is stored.
      "color-interpolation-filters": "sRGB",
    });
    const front = element("feColorMatrix", {
      type: "matrix",
      values: strokeFront(frontRange[0]),
      result: "paint",
    });
    filter.append(
      front,
      element("feComposite", {
        in: "paint",
        in2: "SourceAlpha",
        operator: "in",
      }),
    );
    defs.append(filter);

    const group = element("g", {
      filter: `url(#${filter.id})`,
      visibility: "hidden",
    });
    const frame = element("svg", {
      x: bx,
      y: by,
      width: bw,
      height: bh,
      viewBox: `${ax} ${ay} ${aw} ${ah}`,
      preserveAspectRatio: "none",
    });
    frame.append(
      element("image", {
        href: offerMatte.atlas.src,
        width: offerMatte.atlas.width,
        height: offerMatte.atlas.height,
      }),
    );
    group.append(frame);
    paint.append(group);
    return { id: stroke.id, group, front };
  });

  host.append(svg);
  return { svg, mask, url: `url(#${id})`, strokes };
}

export interface OfferTimelineOptions {
  /** The layers the timeline animates; any may be missing. */
  paint?: Element | null;
  content?: Element | null;
  arrow?: Element | null;
  /** Without a matte (WebKit), the paint fades in instead. */
  matte?: OfferMatte;
  delay?: number;
  paused?: boolean;
  onComplete?: () => void;
}

/** The whole tile reveal as one GSAP timeline, about 0.9 s long. */
export function createOfferTimeline({
  paint,
  content,
  arrow,
  matte,
  delay = 0,
  paused = false,
  onComplete,
}: OfferTimelineOptions) {
  const timing = offerRevealTiming;
  const timeline = gsap.timeline({ paused, delay, onComplete });

  if (paint && matte) {
    // Visible from the start, but masked: nothing shows until a stroke does.
    timeline.set(paint, { opacity: 1 }, 0);
    const [from, to] = frontRange;
    matte.strokes.forEach((stroke, index) => {
      const at = timing.strokes.at + index * timing.strokes.gap;
      timeline.set(stroke.group, { attr: { visibility: "visible" } }, at);
      timeline.fromTo(
        stroke.front,
        { attr: { values: strokeFront(from) } },
        {
          attr: { values: strokeFront(to) },
          duration: timing.strokes.duration,
          ease: timing.strokes.ease,
        },
        at,
      );
      // Once painted, the stroke is simply its image: drop the filter.
      timeline.set(
        stroke.group,
        { attr: { filter: "none" } },
        at + timing.strokes.duration,
      );
    });
  } else if (paint) {
    timeline.fromTo(
      paint,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: "sine.out" },
      timing.strokes.at,
    );
  }

  if (content) {
    timeline.fromTo(
      content,
      { opacity: 0, y: timing.content.lift },
      {
        opacity: 1,
        y: 0,
        duration: timing.content.duration,
        ease: "power2.out",
      },
      timing.content.at,
    );
  }

  if (arrow) {
    timeline.fromTo(
      arrow,
      { opacity: 0, y: timing.arrow.lift },
      {
        opacity: 1,
        y: 0,
        duration: timing.arrow.duration,
        ease: "power2.out",
      },
      timing.arrow.at,
    );
  }
  return timeline;
}

/** Length of the reveal without any delay. */
export const offerRevealLength = Math.max(
  offerRevealTiming.strokes.at +
    (offerMatte.variants.a.length - 1) * offerRevealTiming.strokes.gap +
    offerRevealTiming.strokes.duration,
  offerRevealTiming.content.at + offerRevealTiming.content.duration,
  offerRevealTiming.arrow.at + offerRevealTiming.arrow.duration,
);
