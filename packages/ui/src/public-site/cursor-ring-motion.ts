// The spring of CursorRing (cursor-ring.tsx), after Talking Walls: each
// frame the ring closes a share of the gap to the mouse, turns along that
// gap and stretches by half of it, so a quick flick pulls it into a capsule
// that settles back into a circle. Pure numbers, no DOM.

export interface Point {
  x: number;
  y: number;
}

export const RING_MOTION = {
  /** Share of the gap to the mouse closed in one 60 fps frame. */
  follow: 0.2,
  /** The most the ring grows along its way, in px. */
  maxStretch: 40,
} as const;

/**
 * Where the ring is after one frame. `frames` is that frame's length in
 * 60 fps frames (gsap.ticker.deltaRatio()), so the ring keeps the same pace
 * at any frame rate.
 */
export function followStep(from: Point, to: Point, frames: number): Point {
  const share = 1 - (1 - RING_MOTION.follow) ** frames;
  return {
    x: from.x + (to.x - from.x) * share,
    y: from.y + (to.y - from.y) * share,
  };
}

/**
 * The ring's turn (degrees, 0 = up, clockwise) and stretch (px) for the gap
 * between it and the mouse.
 */
export function ringShape(ring: Point, mouse: Point) {
  const dx = mouse.x - ring.x;
  const dy = mouse.y - ring.y;
  const gap = Math.hypot(dx, dy);
  if (gap === 0) return { rotation: 0, stretch: 0 };
  return {
    rotation: (Math.atan2(dx, -dy) * 180) / Math.PI,
    stretch: Math.min(gap / 2, RING_MOTION.maxStretch),
  };
}
