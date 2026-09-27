// The matte and its schedule: the backdrop's brush strokes and the photo's
// blooms. These tests check the structure the reveal relies on (strokes,
// their order and timing, what GSAP touches, the first and last frame);
// whether it looks painted is judged in Storybook
// (Slow Motion Debug, Matte Debug, Frame Strip), not here.
import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import {
  captionTiming,
  createPaintMatte,
  createPaintTimeline,
  paintRevealLength,
  paintSchedule,
  photoSplashTiming,
  strokeTiming,
} from "./watercolor-paint-matte";
import { paintMatte } from "./watercolor-paint-matte.data";
import { watercolorSplash } from "./watercolor-splash-matte.data";

const backdropStrokes = () =>
  paintMatte.backdrop.strokes.map((stroke) => ({
    ...stroke,
    ...strokeTiming(stroke.id),
  }));

// A backdrop stroke's centreline as points.
function points(line: readonly number[]) {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < line.length; i += 2) out.push([line[i]!, line[i + 1]!]);
  return out;
}

// Direction of a line (not of travel), in degrees from horizontal, -90..90.
function lineAngle([x0, y0]: [number, number], [x1, y1]: [number, number]) {
  const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  return ((((angle + 90) % 180) + 180) % 180) - 90;
}

// How far the direction of travel turns along a centreline, in degrees.
function turning(line: readonly number[]) {
  const p = points(line);
  let total = 0;
  for (let i = 2; i < p.length; i++) {
    const a = Math.atan2(
      p[i - 1]![1] - p[i - 2]![1],
      p[i - 1]![0] - p[i - 2]![0],
    );
    const b = Math.atan2(p[i]![1] - p[i - 1]![1], p[i]![0] - p[i - 1]![0]);
    total += Math.atan2(Math.sin(b - a), Math.cos(b - a));
  }
  return Math.abs((total * 180) / Math.PI);
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

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("paint schedule", () => {
  it("times every backdrop stroke, and nothing else", () => {
    expect(Object.keys(paintSchedule).sort()).toEqual(
      paintMatte.backdrop.strokes.map((stroke) => stroke.id).sort(),
    );
    // The photo is not painted with strokes.
    expect(paintMatte).not.toHaveProperty("photo");
  });

  it("paints the backdrop with only dry-brush streaks and strokes found in its picture", () => {
    const strokes = backdropStrokes();

    expect(strokes.length).toBeGreaterThanOrEqual(16);
    expect(strokes.some((stroke) => stroke.kind === "dry")).toBe(true);
    expect(strokes.some((stroke) => stroke.kind === "stroke")).toBe(true);
    for (const stroke of strokes) {
      expect(stroke.line.length, stroke.id).toBeGreaterThanOrEqual(8);
      expect(stroke.soft, stroke.id).toBe(false);
    }
  });

  it("follows the picture's brushwork: no strips, no single angle, curves stay curved", () => {
    const brush = backdropStrokes();
    const angles = brush.map(({ line }) => {
      const p = points(line);
      return lineAngle(p[0]!, p.at(-1)!);
    });

    // Many directions, not one angle for every stroke...
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThanOrEqual(
      45,
    );
    // ...and not a stack of horizontal strips.
    const flat = angles.filter((angle) => Math.abs(angle) < 10);
    expect(flat.length).toBeLessThanOrEqual(brush.length / 4);
    // Several strokes bend on their way, as the brushwork does.
    const curved = brush.filter(({ line }) => turning(line) >= 25);
    expect(curved.length).toBeGreaterThanOrEqual(5);
  });

  it("paints the backdrop from both edges at once: pink from the left, green from the right", () => {
    const { width } = paintMatte.backdrop;
    const strokes = backdropStrokes();
    const pink = strokes.filter((stroke) => stroke.side === "pink");
    const green = strokes.filter((stroke) => stroke.side === "green");
    expect(pink.length + green.length).toBe(strokes.length);

    for (const side of [pink, green]) {
      expect(Math.min(...side.map((stroke) => stroke.at))).toBeLessThanOrEqual(
        0.05,
      );
    }
    // Each side begins at its own edge...
    const first = (side: typeof strokes) =>
      side.reduce((a, b) => (b.at < a.at ? b : a));
    expect(first(pink).line[0]).toBeLessThan(0.15 * width);
    expect(first(green).line[0]).toBeGreaterThan(0.85 * width);
    // ...its regions sit on its half of the picture...
    for (const { id, line } of pink)
      expect(line[0], id).toBeLessThan(0.55 * width);
    for (const { id, line } of green) {
      expect(line[0], id).toBeGreaterThan(0.45 * width);
    }
    // ...and its brushes travel toward the centre.
    for (const { id, line } of strokes) {
      const [[x0], [x1]] = [points(line)[0]!, points(line).at(-1)!];
      if (Math.abs(x1 - x0) < 40) continue;
      if (pink.some((stroke) => stroke.id === id)) {
        expect(x1, id).toBeGreaterThan(x0);
      } else {
        expect(x1, id).toBeLessThan(x0);
      }
    }
  });

  it("staggers strokes 20 to 90 ms apart, each starting before the last ends", () => {
    const groups = (["pink", "green"] as const).map((side) =>
      backdropStrokes().filter((stroke) => stroke.side === side),
    );
    for (const group of groups) {
      const strokes = [...group].sort((a, b) => a.at - b.at);
      const gaps = new Set<number>();
      for (let i = 1; i < strokes.length; i++) {
        const gap = strokes[i]!.at - strokes[i - 1]!.at;
        gaps.add(Math.round(gap * 1000));
        expect(gap, strokes[i]!.id).toBeGreaterThanOrEqual(0.02 - 1e-9);
        expect(gap, strokes[i]!.id).toBeLessThanOrEqual(0.09 + 1e-9);
        expect(strokes[i]!.at).toBeLessThan(end(strokes[i - 1]!));
      }
      // Irregular, not a metronome.
      expect(gaps.size).toBeGreaterThan(2);
    }
  });

  it("starts the photo while the backdrop is still painting", () => {
    const backdropEnd = Math.max(...backdropStrokes().map(end));
    const photo = photoSplashTiming;

    expect(photo.at).toBeGreaterThanOrEqual(0.3);
    expect(photo.at).toBeLessThanOrEqual(0.4);
    expect(photo.at).toBeLessThan(backdropEnd);
    expect(backdropEnd).toBeGreaterThanOrEqual(0.75);
    expect(backdropEnd).toBeLessThanOrEqual(0.95 + 1e-9);

    expect(end(photo)).toBeGreaterThanOrEqual(0.9);
    expect(end(photo)).toBeLessThanOrEqual(1.2 + 1e-9);
  });

  it("spreads the photo in many uneven blooms, from its middle outward", () => {
    const { width, height, blooms } = watercolorSplash.photo;
    expect(blooms.length).toBeGreaterThanOrEqual(15);
    const distance = ([x, y]: readonly number[]) =>
      Math.hypot((x! - width / 2) / width, (y! - height / 2) / height);
    const sorted = [...blooms].sort((a, b) => a.start - b.start);
    // The first blooms sit in the middle...
    for (const bloom of sorted.slice(0, 3)) {
      expect(distance(bloom.seed), bloom.id).toBeLessThan(0.1);
    }
    // ...the last ones far out, and every one is done within the map.
    expect(
      Math.min(...sorted.slice(-5).map((bloom) => distance(bloom.seed))),
    ).toBeGreaterThan(0.2);
    for (const bloom of blooms) {
      expect(bloom.start + bloom.duration, bloom.id).toBeLessThanOrEqual(
        watercolorSplash.photo.time.duration + 1e-9,
      );
    }
    // Irregular timing, not a metronome.
    expect(new Set(blooms.map((bloom) => bloom.start)).size).toBeGreaterThan(
      blooms.length / 3,
    );
  });

  it("brings the caption in last, after the photo reads", () => {
    expect(captionTiming.at).toBeGreaterThan(photoSplashTiming.at + 0.4);
  });
});

describe("paint matte", () => {
  it("builds one hidden SVG: a filtered image per backdrop stroke", () => {
    const { host, matte } = build();

    expect(matte.svg.parentElement).toBe(host);
    expect(matte.svg).toHaveAttribute("aria-hidden", "true");
    expect(matte.svg).toHaveClass("ks-wc__matte");

    const { mask, url, strokes } = matte.backdrop;
    expect(url).toBe(`url(#${mask.id})`);
    // Coverage only: the stroke images keep their time map in colour.
    expect(mask).toHaveAttribute("mask-type", "alpha");
    expect(strokes.map((stroke) => stroke.id)).toEqual(
      paintMatte.backdrop.strokes.map((stroke) => stroke.id),
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
        paintMatte.backdrop.atlas.src,
      );
    }
  });

  it("gives the photo one filtered time map, whatever the number of blooms", () => {
    const { matte } = build();
    const { mask, url, group, front } = matte.photo;
    expect(url).toBe(`url(#${mask.id})`);
    expect(mask).toHaveAttribute("mask-type", "alpha");
    expect(mask.querySelectorAll("image")).toHaveLength(1);
    expect(group.querySelector("image")).toHaveAttribute(
      "href",
      watercolorSplash.photo.time.src,
    );
    const filterId = group.getAttribute("filter")!.match(/^url\(#(.+)\)$/)![1]!;
    const filter = matte.svg.querySelector(`[id="${filterId}"]`)!;
    expect(filter.children).toHaveLength(1);
    expect(filter.contains(front)).toBe(true);
    // Nothing shown yet.
    expect(frontOffset(front)).toBeLessThanOrEqual(0);
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

    expect(timeline.duration()).toBeCloseTo(paintRevealLength, 5);
    expect(timeline.duration()).toBeGreaterThanOrEqual(1);
    expect(timeline.duration()).toBeLessThanOrEqual(1.3);
    timeline.kill();
  });

  it("starts with nothing painted", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });

    for (const { front } of [...matte.backdrop.strokes, matte.photo]) {
      // alpha = offset − sharpness × grey ≤ 0 for every grey ≥ 0.
      expect(frontOffset(front)).toBeLessThanOrEqual(0);
    }
    expect(caption.style.opacity).toBe("0");
    timeline.kill();
  });

  it("only moves the fronts: colour stays white, nothing fades", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });
    const stroke = matte.backdrop.strokes[0]!;
    const matrix = (front: SVGFEColorMatrixElement) =>
      front.getAttribute("values")!.trim().split(/\s+/).slice(0, -1);
    const before = [matrix(stroke.front), matrix(matte.photo.front)];

    timeline.time(strokeTiming(stroke.id).at + 0.2);
    expect(matrix(stroke.front)).toEqual(before[0]);
    expect(frontOffset(stroke.front)).toBeGreaterThan(0);
    expect(frontOffset(stroke.front)).toBeLessThan(stroke.sharpness);

    timeline.time(photoSplashTiming.at + 0.3);
    expect(matrix(matte.photo.front)).toEqual(before[1]);
    expect(frontOffset(matte.photo.front)).toBeGreaterThan(0);
    timeline.kill();
  });

  it("runs the photo's threshold linearly (the blooms' timing is in the map)", () => {
    const { matte } = build();
    const timeline = createPaintTimeline(matte, { paused: true });
    const [tween] = gsap.getTweensOf(matte.photo.front);
    expect(tween!.vars.ease).toBe("none");
    expect(tween!.duration()).toBeCloseTo(photoSplashTiming.duration, 5);
    expect(tween!.startTime()).toBeCloseTo(photoSplashTiming.at, 5);
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

  it("ends with everything fully painted and every filter gone", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption, paused: true });

    timeline.progress(1);
    for (const stroke of matte.backdrop.strokes) {
      expect(stroke.group).toHaveAttribute("visibility", "visible");
      expect(stroke.group).toHaveAttribute("filter", "none");
      // The last matrix it held shows every pixel, whatever its time.
      expect(
        frontOffset(stroke.front) - stroke.sharpness,
      ).toBeGreaterThanOrEqual(1 - 1e-6);
    }
    const { sharpness } = watercolorSplash.photo.time;
    expect(matte.photo.group).toHaveAttribute("filter", "none");
    expect(frontOffset(matte.photo.front) - sharpness).toBeGreaterThanOrEqual(
      1 - 1e-6,
    );
    expect(caption.style.opacity).toBe("1");
    timeline.kill();
  });

  it("leaves nothing running once killed", () => {
    const { matte, caption } = build();
    const timeline = createPaintTimeline(matte, { caption });

    timeline.kill();
    for (const { front, group } of [...matte.backdrop.strokes, matte.photo]) {
      expect(gsap.getTweensOf(front)).toHaveLength(0);
      expect(gsap.getTweensOf(group)).toHaveLength(0);
    }
    expect(gsap.getTweensOf(caption)).toHaveLength(0);
  });
});
