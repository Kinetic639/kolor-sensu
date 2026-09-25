// The paint matte and its schedule. These tests check the structure the
// reveal relies on (strokes, their order and timing, what GSAP touches, the
// first and last frame); whether it looks painted is judged in Storybook
// (Slow Motion Debug, Matte Debug, Frame Strip), not here.
import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import {
  captionTiming,
  createPaintMatte,
  createPaintTimeline,
  type PaintLayerName,
  type PaintMatte,
  paintSchedule,
  strokeTiming,
} from "./watercolor-paint-matte";
import { paintMatte } from "./watercolor-paint-matte.data";

const layers = ["backdrop", "photo"] as const;

function strokesOf(layer: PaintLayerName) {
  return paintMatte[layer].strokes.map((stroke) => ({
    ...stroke,
    ...strokeTiming(layer, stroke.id),
  }));
}

const end = (stroke: { at: number; duration: number }) =>
  stroke.at + stroke.duration;

// The last number of a colour matrix: the paint front, scaled by the
// stroke's sharpness.
function frontOffset(front: SVGFEColorMatrixElement) {
  return Number(front.getAttribute("values")!.trim().split(/\s+/).at(-1));
}

let hosts: HTMLElement[] = [];

function build() {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  const caption = document.createElement("figcaption");
  host.append(caption);
  return { host, caption, matte: createPaintMatte(host) };
}

function allStrokes(matte: PaintMatte) {
  return [...matte.backdrop.strokes, ...matte.photo.strokes];
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("paint schedule", () => {
  it("times every stroke of both mattes, and nothing else", () => {
    for (const layer of layers) {
      expect(Object.keys(paintSchedule[layer]).sort()).toEqual(
        paintMatte[layer].strokes.map((stroke) => stroke.id).sort(),
      );
    }
    expect(paintMatte.backdrop.strokes).toHaveLength(14);
    expect(paintMatte.photo.strokes).toHaveLength(12);
  });

  it("paints the backdrop from both edges at once, toward the centre", () => {
    const { width } = paintMatte.backdrop;
    const strokes = strokesOf("backdrop");
    const left = strokes.filter((stroke) => stroke.id.startsWith("left"));
    const right = strokes.filter((stroke) => stroke.id.startsWith("right"));
    expect(left.length + right.length).toBe(strokes.length);

    for (const side of [left, right]) {
      expect(Math.min(...side.map((stroke) => stroke.at))).toBeLessThanOrEqual(
        0.05,
      );
    }
    for (const { path } of left) {
      expect(path[0]).toBeLessThan(0.15 * width);
      expect(path[4]).toBeGreaterThan(path[0]);
    }
    for (const { path } of right) {
      expect(path[0]).toBeGreaterThan(0.85 * width);
      expect(path[4]).toBeLessThan(path[0]);
    }
    // The two sides run past each other: the centre is where their marks
    // overlap, not a seam.
    expect(Math.max(...left.map(({ path }) => path[4]))).toBeGreaterThan(
      0.6 * width,
    );
    expect(Math.min(...right.map(({ path }) => path[4]))).toBeLessThan(
      0.4 * width,
    );
  });

  it("staggers strokes 20 to 90 ms apart, each starting before the last ends", () => {
    for (const layer of layers) {
      const strokes = strokesOf(layer).sort((a, b) => a.at - b.at);
      for (let i = 1; i < strokes.length; i++) {
        const gap = strokes[i]!.at - strokes[i - 1]!.at;
        expect(gap, strokes[i]!.id).toBeGreaterThanOrEqual(0.02 - 1e-9);
        expect(gap, strokes[i]!.id).toBeLessThanOrEqual(0.09 + 1e-9);
        expect(strokes[i]!.at).toBeLessThan(end(strokes[i - 1]!));
      }
    }
  });

  it("starts the photo from its centre while the backdrop is still painting", () => {
    const backdrop = strokesOf("backdrop");
    const photo = strokesOf("photo");
    const photoStart = Math.min(...photo.map((stroke) => stroke.at));
    const backdropEnd = Math.max(...backdrop.map(end));

    expect(photoStart).toBeGreaterThanOrEqual(0.3);
    expect(photoStart).toBeLessThanOrEqual(0.4);
    expect(photoStart).toBeLessThan(backdropEnd);
    expect(backdropEnd).toBeGreaterThanOrEqual(0.75);
    expect(backdropEnd).toBeLessThanOrEqual(0.95 + 1e-9);

    const photoEnd = Math.max(...photo.map(end));
    expect(photoEnd).toBeGreaterThanOrEqual(0.9);
    expect(photoEnd).toBeLessThanOrEqual(1.2 + 1e-9);
  });

  it("sets the photo brushes down near the centre and moves outward", () => {
    const { width, height } = paintMatte.photo;
    const distance = (x: number, y: number) =>
      Math.hypot(x - width / 2, y - height / 2);
    const strokes = strokesOf("photo").sort((a, b) => a.at - b.at);

    for (const { id, path } of strokes) {
      // Every brush sets down in the middle column of the photo...
      expect(path[0], id).toBeGreaterThan(0.4 * width);
      expect(path[0], id).toBeLessThan(0.6 * width);
      // ...and is dragged away from the centre.
      expect(distance(path[4], path[5]), id).toBeGreaterThan(
        distance(path[0], path[1]),
      );
    }
    // First the centre, then further and further out.
    const rings = [0, 4, 8].map((first) =>
      strokes
        .slice(first, first + 4)
        .map(({ path }) => distance(path[0], path[1])),
    );
    for (let i = 1; i < rings.length; i++) {
      expect(Math.min(...rings[i]!)).toBeGreaterThan(
        Math.max(...rings[i - 1]!),
      );
    }
  });

  it("brings the caption in last, after the photo reads", () => {
    const photoStart = Math.min(...strokesOf("photo").map((s) => s.at));
    expect(captionTiming.at).toBeGreaterThan(photoStart + 0.4);
  });
});

describe("paint matte", () => {
  it("builds one hidden SVG with a mask per layer and a filtered image per stroke", () => {
    const { host, matte } = build();

    expect(matte.svg.parentElement).toBe(host);
    expect(matte.svg).toHaveAttribute("aria-hidden", "true");
    expect(matte.svg).toHaveClass("ks-wc__matte");

    for (const layer of layers) {
      const { mask, url, strokes, splatters } = matte[layer];
      expect(url).toBe(`url(#${mask.id})`);
      // Coverage only: the stroke images keep their time map in colour.
      expect(mask).toHaveAttribute("mask-type", "alpha");
      expect(strokes.map((stroke) => stroke.id)).toEqual(
        paintMatte[layer].strokes.map((stroke) => stroke.id),
      );
      for (const stroke of strokes) {
        expect(mask.contains(stroke.group)).toBe(true);
        expect(stroke.group).toHaveAttribute("visibility", "hidden");
        const filterId = stroke.group
          .getAttribute("filter")!
          .match(/^url\(#(.+)\)$/)![1]!;
        const filter = matte.svg.querySelector(`[id="${filterId}"]`)!;
        expect(filter.contains(stroke.front)).toBe(true);
        expect(filter.querySelector("feComposite")).toHaveAttribute(
          "operator",
          "in",
        );
        expect(stroke.group.querySelector("image")).toHaveAttribute(
          "href",
          paintMatte[layer].atlas.src,
        );
      }
      for (const { dot } of splatters) {
        expect(mask.contains(dot)).toBe(true);
        expect(dot).toHaveAttribute("r", "0");
      }
    }
  });

  it("gives each matte its own ids, so two images never share a mask", () => {
    const first = build().matte;
    const second = build().matte;

    expect(first.backdrop.url).not.toBe(second.backdrop.url);
    expect(first.photo.url).not.toBe(second.photo.url);
    const ids = [first, second].flatMap((matte) =>
      Array.from(matte.svg.querySelectorAll("[id]"), (node) => node.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("paint timeline", () => {
  it("lasts about 1.2 s", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });
    const strokesEnd = Math.max(
      ...layers.flatMap((layer) => strokesOf(layer).map(end)),
    );

    expect(timeline.duration()).toBeCloseTo(strokesEnd, 5);
    expect(timeline.duration()).toBeGreaterThanOrEqual(1);
    expect(timeline.duration()).toBeLessThanOrEqual(1.3);
    timeline.kill();
  });

  it("starts with nothing painted", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });

    for (const stroke of allStrokes(matte)) {
      // alpha = offset − sharpness × grey ≤ 0 for every grey ≥ 0.
      expect(frontOffset(stroke.front)).toBeLessThanOrEqual(0);
    }
    expect(caption.style.opacity).toBe("0");
    timeline.kill();
  });

  it("only moves the paint fronts: colour stays white, nothing fades", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });
    const stroke = matte.photo.strokes[0]!;
    const matrix = () =>
      stroke.front.getAttribute("values")!.trim().split(/\s+/).slice(0, -1);
    const before = matrix();

    timeline.time(strokeTiming("photo", stroke.id).at + 0.2);
    expect(matrix()).toEqual(before);
    expect(frontOffset(stroke.front)).toBeGreaterThan(0);
    expect(frontOffset(stroke.front)).toBeLessThan(stroke.sharpness);
    timeline.kill();
  });

  it("animates the matte and the caption only, never the painted layers", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });

    const tweens = timeline.getChildren(true, true, false) as gsap.core.Tween[];
    expect(tweens.length).toBeGreaterThan(0);
    for (const tween of tweens) {
      for (const target of tween.targets<Element>()) {
        if (target === caption) {
          expect(Object.keys(tween.vars)).toContain("opacity");
          expect(tween.vars).not.toHaveProperty("y");
          expect(tween.vars).not.toHaveProperty("x");
        } else {
          expect(matte.svg.contains(target)).toBe(true);
          expect(Object.keys(tween.vars)).not.toContain("opacity");
        }
      }
    }
    timeline.kill();
  });

  it("ends with every stroke fully painted and every filter gone", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });

    timeline.progress(1);
    for (const stroke of allStrokes(matte)) {
      expect(stroke.group).toHaveAttribute("visibility", "visible");
      expect(stroke.group).toHaveAttribute("filter", "none");
      // The last matrix it held shows every pixel, whatever its time.
      expect(
        frontOffset(stroke.front) - stroke.sharpness,
      ).toBeGreaterThanOrEqual(1 - 1e-6);
    }
    for (const layer of layers) {
      for (const { dot, radius } of matte[layer].splatters) {
        expect(Number(dot.getAttribute("r"))).toBeCloseTo(radius);
      }
    }
    expect(caption.style.opacity).toBe("1");
    timeline.kill();
  });

  it("leaves nothing running once killed", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption });

    timeline.kill();
    for (const stroke of allStrokes(matte)) {
      expect(gsap.getTweensOf(stroke.front)).toHaveLength(0);
      expect(gsap.getTweensOf(stroke.group)).toHaveLength(0);
    }
    expect(gsap.getTweensOf(caption)).toHaveLength(0);
  });
});
