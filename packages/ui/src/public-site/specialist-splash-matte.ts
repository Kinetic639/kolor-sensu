import { gsap } from "gsap";
import { splashMatte } from "./specialist-splash-matte.data";

// The splash matte of SpecialistWatercolorCard's entrance animation. The
// watercolor splash behind a specialist is not faded or wiped in and not
// painted with brush strokes (that is WatercolorImage): it spreads, the way
// water carries pigment across wet paper, in blooms.
//
//   <mask>        referenced by mask-image: url(#…) on the splash layer
//     time map    one image of the whole box (specialist-splash-matte.data.ts)
//                 whose grey says when each pixel gets paint. The generator
//                 bakes every bloom into it: each spreads outward from its
//                 own seed through a warped field with lobes and a
//                 cauliflower edge, blooms near the torso first and the
//                 outer ones later, each with its own ease.
//     filter      shows the pixels whose time has come, with a soft, wet
//                 front (a low threshold slope).
//
// GSAP only runs the threshold, linearly: the timing is all in the map. One
// filter and one tween per card, however many blooms there are. The final
// shape is the splash asset's own alpha: the blooms together cover the whole
// box (the generator checks it), so dropping the matte changes nothing.
//
// Two variants: "a" as generated, "b" mirrored, so neighbouring cards do not
// bloom identically.

export type SplashMatteVariant = "a" | "b";

export interface SplashMatte {
  svg: SVGSVGElement;
  mask: SVGMaskElement;
  /** mask-image value for the splash layer. */
  url: string;
  /** The time map, filtered by `front`. */
  group: SVGGElement;
  /** Its paint threshold (the filter's colour matrix). */
  front: SVGFEColorMatrixElement;
}

/** When each part of the card appears (s from the start of the reveal). */
export const specialistRevealTiming = {
  portrait: { at: 0, duration: 0.5, lift: 14 },
  splash: { at: 0.2 },
  stain: { at: 0.5, duration: 0.4 },
  // Opacity only: the plate holds the card link's overlay, and moving it
  // would move the overlay's box with it (a layout shift, CLS).
  plate: { at: 0.66, duration: 0.38 },
} as const;

/** Images the matte draws with; loaded before the reveal starts. */
export const splashMatteUrls = [splashMatte.time.src];

// A wet front: soft enough that a bloom's edge bleeds for a few steps of its
// time map instead of cutting like a brush. (The generator matches it to
// the bloom fronts it baked in.)
export const BLOOM_SHARPNESS = splashMatte.time.sharpness;

const SVG_NS = "http://www.w3.org/2000/svg";
let matteCount = 0;

// alpha = sharpness × (front − grey), in white; only the last number
// changes while the splash spreads.
function bloomFront(front: number) {
  const offset = Math.round(BLOOM_SHARPNESS * front * 1000) / 1000;
  return `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${-BLOOM_SHARPNESS} 0 0 0 ${offset}`;
}

// Past both ends, so the splash starts with no paint and ends with all of
// it.
const frontRange = [-1 / BLOOM_SHARPNESS, 1 + 1 / BLOOM_SHARPNESS] as const;

/**
 * Builds the splash matte (nothing revealed yet) inside `host`. Mask the
 * splash layer with `matte.url`.
 */
export function createSplashMatte(
  host: Element,
  variant: SplashMatteVariant = "a",
): SplashMatte {
  const document = host.ownerDocument;
  const id = `ks-splash-matte-${++matteCount}`;
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
    class: "ks-sp__matte",
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
  const { width, height } = splashMatte;
  const mirror = variant === "b" ? `translate(1 0) scale(-1 1) ` : "";
  const paint = element("g", {
    transform: `${mirror}scale(${1 / width} ${1 / height})`,
  });
  mask.append(paint);
  defs.append(mask);

  // The map covers the whole box, opaque: the threshold alone decides.
  const filter = element("filter", {
    id: `${id}-front`,
    filterUnits: "userSpaceOnUse",
    x: 0,
    y: 0,
    width,
    height,
    // Read the grey channel as it is stored.
    "color-interpolation-filters": "sRGB",
  });
  const front = element("feColorMatrix", {
    type: "matrix",
    values: bloomFront(frontRange[0]),
  });
  filter.append(front);
  defs.append(filter);
  const group = element("g", { filter: `url(#${filter.id})` });
  group.append(
    element("image", {
      href: splashMatte.time.src,
      width,
      height,
      preserveAspectRatio: "none",
    }),
  );
  paint.append(group);

  host.append(svg);
  return { svg, mask, url: `url(#${id})`, group, front };
}

export interface SplashTimelineOptions {
  /** The layers the timeline animates; any may be missing. */
  portrait?: Element | null;
  splash?: Element | null;
  stain?: Element | null;
  plate?: Element | null;
  /** Without a matte (WebKit), the splash fades in instead of blooming. */
  matte?: SplashMatte;
  delay?: number;
  paused?: boolean;
  onComplete?: () => void;
}

/** The whole card reveal as one GSAP timeline, about 1.05 s long. */
export function createSplashTimeline({
  portrait,
  splash,
  stain,
  plate,
  matte,
  delay = 0,
  paused = false,
  onComplete,
}: SplashTimelineOptions) {
  const timing = specialistRevealTiming;
  // Not lazy: the hidden start is written at once, not at the end of the
  // frame (nothing flashes, and it holds however busy the machine is).
  const timeline = gsap.timeline({
    paused,
    delay,
    onComplete,
    defaults: { lazy: false },
  });

  if (portrait) {
    timeline.fromTo(
      portrait,
      { opacity: 0, y: timing.portrait.lift },
      {
        opacity: 1,
        y: 0,
        duration: timing.portrait.duration,
        ease: "power2.out",
      },
      timing.portrait.at,
    );
  }

  if (splash && matte) {
    // Visible from the start, but masked: nothing shows until a bloom does.
    timeline.set(splash, { opacity: 1 }, 0);
    const [from, to] = frontRange;
    const { duration } = splashMatte.time;
    timeline.fromTo(
      matte.front,
      { attr: { values: bloomFront(from) } },
      // Linear: each bloom's start and ease are in the time map.
      { attr: { values: bloomFront(to) }, duration, ease: "none" },
      timing.splash.at,
    );
    // Once painted, the map is simply opaque: drop the filter.
    timeline.set(
      matte.group,
      { attr: { filter: "none" } },
      timing.splash.at + duration,
    );
  } else if (splash) {
    timeline.fromTo(
      splash,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: "sine.out" },
      timing.splash.at,
    );
  }

  if (stain) {
    timeline.fromTo(
      stain,
      { opacity: 0 },
      { opacity: 1, duration: timing.stain.duration, ease: "sine.out" },
      timing.stain.at,
    );
  }

  if (plate) {
    timeline.fromTo(
      plate,
      { opacity: 0 },
      { opacity: 1, duration: timing.plate.duration, ease: "power2.out" },
      timing.plate.at,
    );
  }
  return timeline;
}

/** Length of the reveal without any delay: the splash or the plate. */
export const splashRevealLength = Math.max(
  specialistRevealTiming.plate.at + specialistRevealTiming.plate.duration,
  specialistRevealTiming.stain.at + specialistRevealTiming.stain.duration,
  specialistRevealTiming.splash.at + splashMatte.time.duration,
);
