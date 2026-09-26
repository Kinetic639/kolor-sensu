import { gsap } from "gsap";
import { splashMatte } from "./specialist-splash-matte.data";

// The splash matte of SpecialistWatercolorCard's entrance animation. The
// watercolor splash behind a specialist is not faded or wiped in and not
// painted with brush strokes (that is WatercolorImage): it spreads, the way
// water carries pigment across wet paper, in blooms.
//
//   <mask>        referenced by mask-image: url(#…) on the splash layer
//     blooms      one image per bloom region, cut from the atlas
//                 (specialist-splash-matte.data.ts). Its alpha is the
//                 region's finished shape, its grey channel says when each
//                 pixel gets paint: outward from the bloom's seed, through a
//                 warped field with lobes and a cauliflower edge.
//     filter      per bloom: shows the pixels whose time has come, with a
//                 soft, wet front (a low threshold slope), times the alpha.
//
// GSAP only schedules: a tween of the threshold per bloom, blooms near the
// torso first and the outer ones later (their start comes with the data),
// each settling from a slightly paler wash to full strength. The final shape
// is the splash asset's own alpha: the blooms together cover the whole box
// (the generator checks it), so dropping the matte changes nothing.
//
// Two variants: "a" as generated, "b" mirrored, so neighbouring cards do not
// bloom identically.

export type SplashMatteVariant = "a" | "b";

export interface SplashBloom {
  id: string;
  group: SVGGElement;
  front: SVGFEColorMatrixElement;
  /** Start after the splash starts, and how long it spreads (s). */
  start: number;
  duration: number;
}

export interface SplashMatte {
  svg: SVGSVGElement;
  mask: SVGMaskElement;
  /** mask-image value for the splash layer. */
  url: string;
  blooms: SplashBloom[];
}

/** When each part of the card appears (s from the start of the reveal). */
export const specialistRevealTiming = {
  portrait: { at: 0, duration: 0.5, lift: 14 },
  splash: { at: 0.2 },
  stain: { at: 0.5, duration: 0.4 },
  plate: { at: 0.66, duration: 0.38, lift: 10 },
} as const;

/** Images the matte draws with; loaded before the reveal starts. */
export const splashMatteUrls = [splashMatte.atlas.src];

// A wet front: soft enough that a bloom's edge bleeds for a few steps of its
// time map instead of cutting like a brush.
export const BLOOM_SHARPNESS = 26;

const SVG_NS = "http://www.w3.org/2000/svg";
let matteCount = 0;

// alpha = sharpness × (front − grey), in white; only the last number
// changes while a bloom spreads.
function bloomFront(front: number) {
  const offset = Math.round(BLOOM_SHARPNESS * front * 1000) / 1000;
  return `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${-BLOOM_SHARPNESS} 0 0 0 ${offset}`;
}

// Past both ends, so a bloom starts with no paint and ends with all of it.
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

  const blooms = splashMatte.blooms.map((bloom): SplashBloom => {
    const [bx, by, bw, bh] = bloom.box;
    const [ax, ay, aw, ah] = bloom.atlas;
    const filter = element("filter", {
      id: `${id}-${bloom.id}`,
      filterUnits: "userSpaceOnUse",
      x: bx,
      y: by,
      width: bw,
      height: bh,
      "color-interpolation-filters": "sRGB",
    });
    const front = element("feColorMatrix", {
      type: "matrix",
      values: bloomFront(frontRange[0]),
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
        href: splashMatte.atlas.src,
        width: splashMatte.atlas.width,
        height: splashMatte.atlas.height,
      }),
    );
    group.append(frame);
    paint.append(group);
    return {
      id: bloom.id,
      group,
      front,
      start: bloom.start,
      duration: bloom.duration,
    };
  });

  host.append(svg);
  return { svg, mask, url: `url(#${id})`, blooms };
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
  const timeline = gsap.timeline({ paused, delay, onComplete });

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
    for (const bloom of matte.blooms) {
      const at = timing.splash.at + bloom.start;
      timeline.set(bloom.group, { attr: { visibility: "visible" } }, at);
      timeline.fromTo(
        bloom.front,
        { attr: { values: bloomFront(from) } },
        {
          attr: { values: bloomFront(to) },
          duration: bloom.duration,
          ease: "sine.out",
        },
        at,
      );
      // The wet wash is paler until the pigment settles.
      timeline.fromTo(
        bloom.group,
        { opacity: 0.7 },
        { opacity: 1, duration: bloom.duration, ease: "sine.in" },
        at,
      );
      timeline.set(
        bloom.group,
        { attr: { filter: "none" } },
        at + bloom.duration,
      );
    }
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
      { opacity: 0, y: timing.plate.lift },
      {
        opacity: 1,
        y: 0,
        duration: timing.plate.duration,
        ease: "power2.out",
      },
      timing.plate.at,
    );
  }
  return timeline;
}

/** Length of the reveal without any delay: the last bloom or the plate. */
export const splashRevealLength = Math.max(
  specialistRevealTiming.plate.at + specialistRevealTiming.plate.duration,
  specialistRevealTiming.stain.at + specialistRevealTiming.stain.duration,
  ...splashMatte.blooms.map(
    (bloom) => specialistRevealTiming.splash.at + bloom.start + bloom.duration,
  ),
);
