import { gsap } from "gsap";

// The entrance animation of WatercolorImage as one GSAP timeline. It only
// moves numbers: custom properties on the component's root element, each
// going from 0 (not started) to 1 (finished), which public-site.css turns
// into brush-mask positions and sizes. Nothing here touches layout, so the
// reveal cannot shift the page.
//
//   0 s      the backdrop is painted from the left and the right edge at once
//   0.75 s   the photo starts to spread from its centre, while the backdrop
//            strokes are still on their way to the middle; it starts thin
//            and pale, as if wet, and dries to its real colours
//   2.5 s    the caption settles in
//   3.4 s    done: every value is at the static composition

export const revealProperties = {
  left: "--ks-reveal-left",
  right: "--ks-reveal-right",
  photoX: "--ks-reveal-photo-x",
  photoY: "--ks-reveal-photo-y",
  dry: "--ks-reveal-dry",
  caption: "--ks-reveal-caption",
  fade: "--ks-reveal-fade",
} as const;

// Brush masks the reveal styles use; loaded before the animation starts, so
// no stroke waits for its mask mid-way.
export const revealMaskUrls = [
  "/watercolor/reveal-backdrop-left.png",
  "/watercolor/reveal-backdrop-left-wash.png",
  "/watercolor/reveal-backdrop-right.png",
  "/watercolor/reveal-backdrop-right-wash.png",
  "/watercolor/reveal-photo.png",
] as const;

export interface RevealTimelineOptions {
  paused?: boolean;
  onComplete?: () => void;
}

const p = revealProperties;

export function createWatercolorRevealTimeline(
  root: HTMLElement,
  { paused = false, onComplete }: RevealTimelineOptions = {},
) {
  const timeline = gsap.timeline({ paused, onComplete });
  const step = (
    property: string,
    [from, to]: [number, number],
    duration: number,
    ease: string,
    position: gsap.Position,
  ) =>
    timeline.fromTo(
      root,
      { [property]: from },
      { [property]: to, duration, ease },
      position,
    );

  timeline.addLabel("backdrop", 0);
  // Two brushes, one from each edge; the right one a beat later and a touch
  // slower, so the strokes don't mirror each other. Each moves quickly off
  // the edge and slows down as it reaches the middle.
  step(p.left, [0, 1], 2.2, "power1.out", "backdrop");
  step(p.right, [0, 1], 2.3, "power1.out", "backdrop+=0.12");

  timeline.addLabel("photo", 0.75);
  // While the strokes are still meeting in the middle, the photo spreads
  // from its centre, a little faster sideways, and slows down as it soaks
  // out to the edges. It starts thin and pale and dries to full colour.
  step(p.photoX, [0, 1], 2.4, "power1.out", "photo");
  step(p.photoY, [0, 1], 2.6, "power1.out", "photo");
  step(p.dry, [0, 1], 2.4, "sine.out", "photo");

  timeline.addLabel("caption", 2.5);
  step(p.caption, [0, 1], 0.9, "power2.out", "caption");

  return timeline;
}

// Reduced-motion alternative: the whole composition simply fades in.
export function createWatercolorFadeTimeline(
  root: HTMLElement,
  { paused = false, onComplete }: RevealTimelineOptions = {},
) {
  return gsap
    .timeline({ paused, onComplete })
    .fromTo(
      root,
      { [p.fade]: 0 },
      { [p.fade]: 1, duration: 0.6, ease: "sine.out" },
    );
}

export function clearRevealProperties(root: HTMLElement) {
  for (const property of Object.values(revealProperties)) {
    root.style.removeProperty(property);
  }
}
