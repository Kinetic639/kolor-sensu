// PaintedStory's step tracker: the wave stood on end, one point per step.
import { describe, expect, it } from "vitest";
import { storyWave, storyWaveDrawn } from "./painted-story-wave";

describe("storyWave", () => {
  it("has one point per step, evenly down the tracker, first to last", () => {
    const { points } = storyWave(4);
    expect(points).toEqual([20, 340, 660, 980]);
  });

  it("runs from the first point to the last, swinging right then left between each pair", () => {
    const { path, points } = storyWave(3);
    expect(path.startsWith(`M25,${points[0]}`)).toBe(true);
    expect(path.endsWith(`25,${points.at(-1)}`)).toBe(true);
    // Three curves per gap: out to the right, across to the left, back in.
    expect(path.match(/C/g)).toHaveLength(6);
    expect(path).toContain(" 44,140");
    expect(path).toContain(" 6,380");
    expect(path).toContain(" 44,620");
    expect(path).toContain(" 6,860");
  });

  it("is a plain line for a story of one step", () => {
    expect(storyWave(1)).toEqual({ path: "M25,20 L25,980", points: [500] });
  });
});

describe("storyWaveDrawn", () => {
  it("gets to each step's point as that step begins", () => {
    expect(storyWaveDrawn(0, 4)).toBe(0);
    expect(storyWaveDrawn(0.25, 4)).toBeCloseTo(1 / 3);
    expect(storyWaveDrawn(0.5, 4)).toBeCloseTo(2 / 3);
    expect(storyWaveDrawn(0.75, 4)).toBe(1);
  });

  it("stays whole through the last step", () => {
    expect(storyWaveDrawn(1, 4)).toBe(1);
  });
});
