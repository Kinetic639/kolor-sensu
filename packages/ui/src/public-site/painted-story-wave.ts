// The step tracker of PaintedStory (painted-story.tsx): the wave of
// FirstSteps stood on end. A line that runs down through one point per
// step, swinging right and then left between each pair, in a 50 x 1000 space
// stretched over the tracker's column. Pure numbers, no DOM.

import { smoothPath, type WavePoint } from "./first-steps-wave";

const MIDDLE = 25;
const SWING = 19;
// A little air at both ends, so the first and last points are not cut.
const TOP = 20;
const BOTTOM = 980;

export interface StoryWave {
  /** The line, from the first step's point to the last one's. */
  path: string;
  /** Where each step's point sits down the tracker (0 to 1000). */
  points: readonly number[];
}

/** The tracker for a story of `count` steps. */
export function storyWave(count: number): StoryWave {
  if (count < 2) {
    return {
      path: `M${MIDDLE},${TOP} L${MIDDLE},${BOTTOM}`,
      points: count === 1 ? [(TOP + BOTTOM) / 2] : [],
    };
  }
  const gap = (BOTTOM - TOP) / (count - 1);
  const points = Array.from({ length: count }, (_, index) => TOP + index * gap);
  const through: WavePoint[] = [];
  points.forEach((y, index) => {
    through.push([MIDDLE, y]);
    if (index < count - 1) {
      // Out to the right, back across to the left, and in again.
      through.push([MIDDLE + SWING, y + gap / 4]);
      through.push([MIDDLE - SWING, y + (gap * 3) / 4]);
    }
  });
  return { path: smoothPath(through), points };
}

/**
 * How much of the line is drawn (0 to 1) at `progress` through the story
 * (0 to 1): it gets to each step's point as that step begins, so it is
 * whole when the last step does.
 */
export function storyWaveDrawn(progress: number, count: number): number {
  if (count < 2) return progress > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, (progress * count) / (count - 1)));
}
