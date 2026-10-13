// The cursor ring's spring (after Talking Walls): the ring closes a fixed
// share of the gap to the mouse each frame, turns along the gap and
// stretches with it, so a fast flick pulls it into a capsule that settles
// back into a circle.
import { describe, expect, it } from "vitest";
import { followStep, RING_MOTION, ringShape } from "./cursor-ring-motion";

describe("followStep", () => {
  it("closes a fifth of the gap in one 60 fps frame", () => {
    const step = followStep({ x: 0, y: 0 }, { x: 100, y: 50 }, 1);
    expect(step.x).toBeCloseTo(20);
    expect(step.y).toBeCloseTo(10);
  });

  it("covers as much in one slow frame as in the frames it stands for", () => {
    const twice = followStep(
      followStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 1),
      { x: 100, y: 0 },
      1,
    );
    const once = followStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 2);
    expect(once.x).toBeCloseTo(twice.x);
  });

  it("never overshoots the mouse, however long the frame", () => {
    const step = followStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 50);
    expect(step.x).toBeLessThanOrEqual(100);
    expect(step.x).toBeGreaterThan(99);
  });
});

describe("ringShape", () => {
  it("is a plain circle when the ring has caught up", () => {
    expect(ringShape({ x: 40, y: 40 }, { x: 40, y: 40 })).toEqual({
      rotation: 0,
      stretch: 0,
    });
  });

  it("points along the way to the mouse (0° up, 90° right, 180° down)", () => {
    const at = { x: 0, y: 0 };
    expect(ringShape(at, { x: 0, y: -10 }).rotation).toBeCloseTo(0);
    expect(ringShape(at, { x: 10, y: 0 }).rotation).toBeCloseTo(90);
    expect(ringShape(at, { x: 0, y: 10 }).rotation).toBeCloseTo(180);
    expect(ringShape(at, { x: -10, y: 0 }).rotation).toBeCloseTo(-90);
  });

  it("stretches by half the gap, up to a limit", () => {
    const at = { x: 0, y: 0 };
    expect(ringShape(at, { x: 30, y: 40 }).stretch).toBe(25);
    expect(ringShape(at, { x: 500, y: 0 }).stretch).toBe(
      RING_MOTION.maxStretch,
    );
  });
});
