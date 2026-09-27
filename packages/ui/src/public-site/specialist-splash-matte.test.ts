// The splash matte and the card's reveal timeline: structure and timing.
// Whether it looks like watercolor spreading is judged in Storybook (Splash
// Matte Debug, Slow Motion Debug, Frame Strip), not here.
import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import {
  BLOOM_SHARPNESS,
  createSplashMatte,
  createSplashTimeline,
  specialistRevealTiming,
  splashRevealLength,
} from "./specialist-splash-matte";
import { splashMatte } from "./specialist-splash-matte.data";

const TORSO = [375, 660] as const;
const distance = ([x, y]: readonly number[]) =>
  Math.hypot(x! - TORSO[0], y! - TORSO[1]);

function frontOffset(front: SVGFEColorMatrixElement) {
  return Number(front.getAttribute("values")!.trim().split(/\s+/).at(-1));
}

let hosts: HTMLElement[] = [];

function build(variant: "a" | "b" = "a") {
  const host = document.createElement("div");
  const layer = () => host.appendChild(document.createElement("div"));
  const [portrait, splash, stain, plate] = [layer(), layer(), layer(), layer()];
  document.body.append(host);
  hosts.push(host);
  return {
    host,
    layers: { portrait, splash, stain, plate },
    matte: createSplashMatte(host, variant),
  };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("splash matte data", () => {
  it("has many independent blooms of different sizes, no circles", () => {
    const { blooms } = splashMatte;
    expect(blooms.length).toBeGreaterThanOrEqual(15);
    const areas = blooms.map(({ box: [, , w, h] }) => w * h);
    expect(Math.max(...areas) / Math.min(...areas)).toBeGreaterThan(3);
    expect(new Set(blooms.map((bloom) => bloom.id)).size).toBe(blooms.length);
  });

  it("starts behind the torso and spreads outward, unevenly", () => {
    const blooms = [...splashMatte.blooms].sort((a, b) => a.start - b.start);
    // The first blooms sit near the torso...
    for (const bloom of blooms.slice(0, 3)) {
      expect(distance(bloom.seed), bloom.id).toBeLessThan(120);
    }
    // ...and on the whole, the further out, the later.
    const n = blooms.length;
    const mean = (values: number[]) =>
      values.reduce((a, b) => a + b, 0) / values.length;
    const d = blooms.map((bloom) => distance(bloom.seed));
    const t = blooms.map((bloom): number => bloom.start);
    const [md, mt] = [mean(d), mean(t)];
    const correlation =
      d.reduce((sum, di, i) => sum + (di - md) * (t[i]! - mt), 0) /
      Math.sqrt(
        d.reduce((sum, di) => sum + (di - md) ** 2, 0) *
          t.reduce((sum, ti) => sum + (ti - mt) ** 2, 0),
      );
    expect(correlation).toBeGreaterThan(0.7);
    // Blooms left, right, above and below the torso, not one direction.
    const sides = new Set(
      blooms.map(({ seed: [x, y] }) =>
        Math.abs(x - TORSO[0]) > Math.abs(y - TORSO[1])
          ? x < TORSO[0]
            ? "left"
            : "right"
          : y < TORSO[1]
            ? "above"
            : "below",
      ),
    );
    expect(sides.size).toBe(4);
    // Irregular timing, not a metronome, and heavy overlap.
    expect(new Set(t).size).toBeGreaterThan(n / 3);
  });

  it("finishes the splash within 0.8 s of its start", () => {
    for (const bloom of splashMatte.blooms) {
      expect(bloom.start + bloom.duration, bloom.id).toBeLessThanOrEqual(
        0.8 + 1e-9,
      );
      expect(bloom.duration, bloom.id).toBeGreaterThanOrEqual(0.3);
    }
  });
});

describe("splash matte", () => {
  it("builds one mask with a single filtered time map, whatever the number of blooms", () => {
    const { host, matte } = build();
    expect(matte.svg.parentElement).toBe(host);
    expect(matte.svg).toHaveAttribute("aria-hidden", "true");
    expect(matte.url).toBe(`url(#${matte.mask.id})`);
    expect(matte.mask).toHaveAttribute("mask-type", "alpha");
    // One filter and one image: the GPU cost does not grow with the blooms.
    expect(matte.svg.querySelectorAll("filter")).toHaveLength(1);
    expect(matte.svg.querySelectorAll("feColorMatrix")).toHaveLength(1);
    const images = matte.svg.querySelectorAll("image");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("href", splashMatte.time.src);
    expect(images[0]).toHaveAttribute("width", String(splashMatte.width));
    expect(images[0]).toHaveAttribute("height", String(splashMatte.height));
    expect(matte.mask.contains(matte.group)).toBe(true);
    // Nothing painted yet.
    expect(frontOffset(matte.front)).toBeLessThanOrEqual(0);
  });

  it("mirrors the layout for variant b, and never shares ids", () => {
    const a = build("a").matte;
    const b = build("b").matte;
    const paint = (matte: typeof a) =>
      matte.mask.firstElementChild!.getAttribute("transform")!;
    expect(paint(a)).not.toContain("scale(-1 1)");
    expect(paint(b)).toContain("translate(1 0) scale(-1 1)");
    const ids = [a, b].flatMap((matte) =>
      Array.from(matte.svg.querySelectorAll("[id]"), (node) => node.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("card reveal timeline", () => {
  it("lasts about a second: portrait, then blooms, the plate last", () => {
    const { layers, matte } = build();
    const timeline = createSplashTimeline({ ...layers, matte, paused: true });
    expect(timeline.duration()).toBeCloseTo(splashRevealLength, 5);
    expect(timeline.duration()).toBeGreaterThanOrEqual(0.9);
    expect(timeline.duration()).toBeLessThanOrEqual(1.4);

    const t = specialistRevealTiming;
    expect(t.portrait.at).toBe(0);
    expect(t.splash.at).toBeGreaterThanOrEqual(0.15);
    expect(t.splash.at).toBeLessThanOrEqual(0.25);
    // Overlapping, not one after another.
    expect(t.splash.at).toBeLessThan(t.portrait.at + t.portrait.duration);
    expect(t.plate.at).toBeGreaterThanOrEqual(0.6);
    expect(t.plate.at).toBeLessThanOrEqual(0.8);
    timeline.kill();
  });

  it("keeps the portrait reveal small: a fade and a short lift", () => {
    const { layers, matte } = build();
    const timeline = createSplashTimeline({ ...layers, matte, paused: true });
    expect(layers.portrait.style.opacity).toBe("0");
    const [tween] = gsap.getTweensOf(layers.portrait);
    expect(tween!.vars).toMatchObject({ opacity: 1, y: 0 });
    for (const property of ["scale", "scaleX", "scaleY", "rotation", "x"]) {
      expect(tween!.vars).not.toHaveProperty(property);
    }
    expect(specialistRevealTiming.portrait.lift).toBeLessThanOrEqual(16);
    timeline.kill();
  });

  it("moves only the bloom fronts inside the matte, and only the four layers", () => {
    const { host, layers, matte } = build();
    const timeline = createSplashTimeline({ ...layers, matte, paused: true });
    const tweens = timeline.getChildren(true, true, false) as gsap.core.Tween[];
    const allowed = new Set<Element>(Object.values(layers));
    for (const tween of tweens) {
      for (const target of tween.targets<Element>()) {
        expect(allowed.has(target) || matte.svg.contains(target)).toBe(true);
        expect(host.contains(target)).toBe(true);
      }
    }
    timeline.kill();
  });

  it("runs the threshold linearly through the time map (the blooms' timing is baked in)", () => {
    const { layers, matte } = build();
    const timeline = createSplashTimeline({ ...layers, matte, paused: true });
    const tweens = gsap.getTweensOf(matte.front);
    expect(tweens).toHaveLength(1);
    expect(tweens[0]!.duration()).toBeCloseTo(splashMatte.time.duration, 5);
    expect(tweens[0]!.vars.ease).toBe("none");
    expect(tweens[0]!.startTime()).toBeCloseTo(
      specialistRevealTiming.splash.at,
      5,
    );
    timeline.kill();
  });

  it("ends with the splash fully painted and unfiltered", () => {
    const { layers, matte } = build();
    const timeline = createSplashTimeline({ ...layers, matte, paused: true });
    timeline.progress(1);
    expect(matte.group).toHaveAttribute("filter", "none");
    expect(frontOffset(matte.front) - BLOOM_SHARPNESS).toBeGreaterThanOrEqual(
      1 - 1e-6,
    );
    for (const layer of Object.values(layers)) {
      expect(layer.style.opacity).toBe("1");
    }
    timeline.kill();
  });

  it("fades the splash instead where there is no matte (WebKit)", () => {
    const { layers } = build();
    const timeline = createSplashTimeline({ ...layers, paused: true });
    expect(layers.splash.style.opacity).toBe("0");
    timeline.progress(1);
    expect(layers.splash.style.opacity).toBe("1");
    timeline.kill();
  });
});
