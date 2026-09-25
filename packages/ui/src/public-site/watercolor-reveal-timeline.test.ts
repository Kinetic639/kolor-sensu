import { describe, expect, it, vi } from "vitest";
import {
  createWatercolorFadeTimeline,
  createWatercolorRevealTimeline,
  revealProperties as p,
} from "./watercolor-reveal-timeline";

// Seeks a paused timeline and reads back the custom properties it drives on
// the root element, the same values the CSS masks read.
function sampler(build = createWatercolorRevealTimeline) {
  const root = document.createElement("div");
  const onComplete = vi.fn();
  const timeline = build(root, { paused: true, onComplete });
  const at = (time: number) => {
    timeline.seek(time);
    const read = (name: string) => Number(root.style.getPropertyValue(name));
    return {
      left: read(p.left),
      right: read(p.right),
      photoX: read(p.photoX),
      photoY: read(p.photoY),
      dry: read(p.dry),
      caption: read(p.caption),
    };
  };
  const times = Array.from(
    { length: Math.ceil(timeline.duration() / 0.02) + 1 },
    (_, i) => Math.min(i * 0.02, timeline.duration()),
  );
  return { root, timeline, at, times, onComplete };
}

describe("createWatercolorRevealTimeline", () => {
  it("starts from an empty sheet: nothing painted yet", () => {
    const { at } = sampler();

    expect(at(0)).toEqual({
      left: 0,
      right: 0,
      photoX: 0,
      photoY: 0,
      dry: 0,
      caption: 0,
    });
  });

  it("paints the backdrop from the left and the right edge at the same time", () => {
    const { at, times } = sampler();

    const firstLeft = times.find((t) => at(t).left > 0)!;
    const firstRight = times.find((t) => at(t).right > 0)!;
    expect(Math.abs(firstLeft - firstRight)).toBeLessThanOrEqual(0.15);

    // Both sides keep moving together, not one after the other.
    const mid = at(0.6);
    expect(mid.left).toBeGreaterThan(0.3);
    expect(mid.right).toBeGreaterThan(0.3);
    expect(Math.abs(mid.left - mid.right)).toBeLessThan(0.2);
  });

  it("starts the photo after the backdrop, while it is still being painted", () => {
    const { at, times } = sampler();

    const photoStart = times.find((t) => at(t).photoX > 0)!;
    expect(photoStart).toBeGreaterThan(0.3);
    const backdrop = at(photoStart);
    expect(backdrop.left).toBeLessThan(1);
    expect(backdrop.right).toBeLessThan(1);
    // ...but the backdrop is well under way by then.
    expect(backdrop.left).toBeGreaterThan(0.5);
  });

  it("spreads the photo outward gradually, a little faster sideways", () => {
    const { at, times } = sampler();

    let previous = 0;
    for (const t of times) {
      const { photoX, photoY } = at(t);
      expect(photoX).toBeGreaterThanOrEqual(previous);
      expect(photoX).toBeGreaterThanOrEqual(photoY);
      previous = photoX;
    }
    // Not a pop: the spread takes well over a second.
    const start = times.find((t) => at(t).photoX > 0)!;
    const end = times.find((t) => at(t).photoX === 1)!;
    expect(end - start).toBeGreaterThan(1.2);
  });

  it("lets the photo dry from a paler, wet look to its real colours", () => {
    const { at, times } = sampler();

    const photoStart = times.find((t) => at(t).photoX > 0)!;
    expect(at(photoStart).dry).toBeLessThan(0.1);
    expect(at(photoStart + 1).dry).toBeGreaterThan(at(photoStart).dry);
  });

  it("brings the caption in last, once the backdrop is painted", () => {
    const { at, times } = sampler();

    const captionStart = times.find((t) => at(t).caption > 0)!;
    const state = at(captionStart);
    expect(state.left).toBe(1);
    expect(state.right).toBe(1);
    expect(state.photoX).toBeGreaterThan(0.8);
  });

  it("ends exactly on the static composition and reports completion", () => {
    const { at, timeline, onComplete } = sampler();

    expect(at(timeline.duration())).toEqual({
      left: 1,
      right: 1,
      photoX: 1,
      photoY: 1,
      dry: 1,
      caption: 1,
    });
    timeline.progress(0.5);
    timeline.progress(1, false);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("stays calm: about three seconds from first stroke to caption", () => {
    const { timeline } = sampler();

    expect(timeline.duration()).toBeGreaterThan(2.6);
    expect(timeline.duration()).toBeLessThan(4);
  });
});

describe("createWatercolorFadeTimeline", () => {
  it("only fades the whole composition in, with no masks or movement", () => {
    const root = document.createElement("div");
    const timeline = createWatercolorFadeTimeline(root, { paused: true });

    timeline.seek(0);
    expect(root.style.getPropertyValue(p.fade)).toBe("0");
    timeline.seek(timeline.duration());
    expect(root.style.getPropertyValue(p.fade)).toBe("1");
    expect(timeline.duration()).toBeLessThanOrEqual(0.8);
    for (const name of [p.left, p.right, p.photoX, p.photoY, p.caption]) {
      expect(root.style.getPropertyValue(name)).toBe("");
    }
  });
});
