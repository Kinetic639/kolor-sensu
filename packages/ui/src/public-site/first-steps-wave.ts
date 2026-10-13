// The wave of FirstSteps (first-steps.tsx): a line that comes in from the
// heading's side, runs through the middle of the steps' circles, rising and
// falling between them, and ends in the last one. In a 1000 x 100 space
// stretched over the row of steps. Pure numbers, no DOM.

export type WavePoint = readonly [x: number, y: number];

/** The four steps' middles along the row (four equal columns). */
export const STEP_CENTRES = [125, 375, 625, 875] as const;

/**
 * From a little left of the row, through every step at mid height with a
 * crest or a trough between each, to the last step's middle: the path ends
 * where the steps do.
 */
export const WAVE_POINTS: readonly WavePoint[] = [
  [-50, 70],
  [125, 50],
  [250, 24],
  [375, 50],
  [500, 78],
  [625, 50],
  [750, 26],
  [875, 50],
];

const round = (value: number) => Math.round(value * 100) / 100;

/** A smooth path through the points (Catmull-Rom, as cubic Béziers). */
export function smoothPath(points: readonly WavePoint[]): string {
  const at = (index: number) =>
    points[Math.min(points.length - 1, Math.max(0, index))]!;
  let path = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    path +=
      ` C${round(x1 + (x2 - x0) / 6)},${round(y1 + (y2 - y0) / 6)}` +
      ` ${round(x2 - (x3 - x1) / 6)},${round(y2 - (y3 - y1) / 6)}` +
      ` ${x2},${y2}`;
  }
  return path;
}

export const WAVE_PATH = smoothPath(WAVE_POINTS);

// How near a step's middle the line's tip has to be for the step to take
// colour: about where the line slips under the circle's edge.
const REACH = 36;

/**
 * How many steps the line has reached when it is drawn to `progress`
 * (0 to 1 of its way): a step takes colour as the line gets to its circle,
 * the last one as the line ends.
 */
export function stepsReached(progress: number): number {
  const from = WAVE_POINTS[0]![0];
  const to = WAVE_POINTS.at(-1)![0];
  const tip = from + progress * (to - from);
  return STEP_CENTRES.filter((x) => tip >= x - REACH).length;
}
