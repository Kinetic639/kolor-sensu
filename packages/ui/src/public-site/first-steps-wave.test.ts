// The wave of FirstSteps: its path through the four steps, and which steps
// the line has reached at a given progress.
import { describe, expect, it } from "vitest";
import {
  STEP_CENTRES,
  smoothPath,
  stepsReached,
  WAVE_PATH,
  WAVE_POINTS,
} from "./first-steps-wave";

describe("the wave", () => {
  it("runs left to right through the middle of each of the four steps", () => {
    expect(STEP_CENTRES).toEqual([125, 375, 625, 875]);
    for (const x of STEP_CENTRES) {
      expect(WAVE_POINTS).toContainEqual([x, 50]);
    }
    const xs = WAVE_POINTS.map(([x]) => x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("comes in from the heading's side and ends in the last step", () => {
    expect(WAVE_POINTS[0]![0]).toBeLessThan(0);
    expect(WAVE_POINTS.at(-1)).toEqual([STEP_CENTRES.at(-1), 50]);
  });

  it("rises and falls between the steps", () => {
    const between = WAVE_POINTS.filter(
      ([x]) => !STEP_CENTRES.includes(x as never) && x > 0,
    ).map(([, y]) => y);
    expect(between.some((y) => y < 50)).toBe(true);
    expect(between.some((y) => y > 50)).toBe(true);
  });

  it("is one smooth path: a start and a curve to every further point", () => {
    expect(WAVE_PATH.startsWith("M-50,")).toBe(true);
    expect(WAVE_PATH.match(/C/g)).toHaveLength(WAVE_POINTS.length - 1);
    expect(
      smoothPath([
        [0, 0],
        [10, 10],
      ]),
    ).toBe("M0,0 C1.67,1.67 8.33,8.33 10,10");
  });
});

describe("stepsReached", () => {
  it("counts the steps the line has got to, one by one", () => {
    expect(stepsReached(0)).toBe(0);
    expect(stepsReached(0.1)).toBe(0);
    expect(stepsReached(0.16)).toBe(1);
    expect(stepsReached(0.45)).toBe(2);
    expect(stepsReached(0.7)).toBe(3);
  });

  it("gives the last step its colour only as the line ends", () => {
    expect(stepsReached(0.94)).toBe(3);
    expect(stepsReached(1)).toBe(4);
  });
});
