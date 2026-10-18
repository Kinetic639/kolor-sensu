// OfferTile's brush matte and reveal timeline: structure and timing.
// Whether it looks painted is judged in Storybook (Brush Matte Debug, Slow
// Motion Debug, Frame Strip), not here.
import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import {
  createOfferMatte,
  createOfferTimeline,
  offerRevealLength,
  offerRevealTiming,
  STROKE_SHARPNESS,
} from "./offer-brush-matte";
import { offerMatte } from "./offer-brush-matte.data";

function frontOffset(front: SVGFEColorMatrixElement) {
  return Number(front.getAttribute("values")!.trim().split(/\s+/).at(-1));
}

// A stroke's centreline: start, control, end.
function ends(path: readonly number[]) {
  return {
    from: [path[0]!, path[1]!] as const,
    to: [path[4]!, path[5]!] as const,
  };
}

// Where a stroke sits from top (0) to bottom of the tile, across its angle.
function depth(path: readonly number[]) {
  const { from, to } = ends(path);
  return (from[1] + to[1]) / 2;
}

let hosts: HTMLElement[] = [];

function build(variant: "a" | "b" = "a") {
  const host = document.createElement("div");
  const layer = () => host.appendChild(document.createElement("div"));
  const [paint, content, arrow] = [layer(), layer(), layer()];
  document.body.append(host);
  hosts.push(host);
  return {
    host,
    layers: { paint, content, arrow },
    matte: createOfferMatte(host, variant),
  };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("offer brush strokes", () => {
  it("paints each variant in five strokes", () => {
    expect(offerMatte.variants.a).toHaveLength(5);
    expect(offerMatte.variants.b).toHaveLength(5);
  });

  it("runs every stroke across the tile at 20-25°, rising to the right", () => {
    for (const variant of ["a", "b"] as const) {
      for (const { id, path } of offerMatte.variants[variant]) {
        const { from, to } = ends(path);
        const [left, right] = from[0] < to[0] ? [from, to] : [to, from];
        const angle =
          (Math.atan2(left[1] - right[1], right[0] - left[0]) * 180) / Math.PI;
        expect(angle, `${variant} ${id}`).toBeGreaterThanOrEqual(20);
        expect(angle, `${variant} ${id}`).toBeLessThanOrEqual(25);
        // Starts and ends outside the tile: no brush-down or lift in it.
        for (const [x, y] of [from, to]) {
          const outside =
            x < 0 || x > offerMatte.width || y < 0 || y > offerMatte.height;
          expect(outside, `${variant} ${id}`).toBe(true);
        }
      }
    }
  });

  it("paints odd tiles top to bottom, even tiles bottom to top", () => {
    const order = (variant: "a" | "b") =>
      offerMatte.variants[variant].map(({ path }) => depth(path));
    const a = order("a");
    const b = order("b");
    for (let i = 1; i < 5; i++) {
      expect(a[i]).toBeGreaterThan(a[i - 1]!);
      expect(b[i]).toBeLessThan(b[i - 1]!);
    }
    // The same five bands, in opposite orders.
    expect([...b].reverse()).toEqual(a);
  });

  it("goes back and forth, each variant starting from its own side", () => {
    const leftToRight = (variant: "a" | "b") =>
      offerMatte.variants[variant].map(({ path }) => {
        const { from, to } = ends(path);
        return from[0] < to[0];
      });
    expect(leftToRight("a")).toEqual([true, false, true, false, true]);
    expect(leftToRight("b")).toEqual([false, true, false, true, false]);
  });
});

describe("offer brush matte", () => {
  it("builds one hidden mask with a filtered image per stroke", () => {
    const { host, matte } = build();
    expect(matte.svg.parentElement).toBe(host);
    expect(matte.svg).toHaveAttribute("aria-hidden", "true");
    expect(matte.url).toBe(`url(#${matte.mask.id})`);
    expect(matte.mask).toHaveAttribute("mask-type", "alpha");
    expect(matte.strokes.map((stroke) => stroke.id)).toEqual(
      offerMatte.variants.a.map((stroke) => stroke.id),
    );
    for (const stroke of matte.strokes) {
      expect(matte.mask.contains(stroke.group)).toBe(true);
      expect(stroke.group).toHaveAttribute("visibility", "hidden");
      expect(stroke.group.querySelector("image")).toHaveAttribute(
        "href",
        offerMatte.atlas.src,
      );
      expect(frontOffset(stroke.front)).toBeLessThanOrEqual(0);
    }
  });

  it("gives each matte its own ids", () => {
    const ids = [build("a").matte, build("b").matte].flatMap((matte) =>
      Array.from(matte.svg.querySelectorAll("[id]"), (node) => node.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("offer reveal timeline", () => {
  it("is quick: five strokes overlapping, content, then the arrow", () => {
    const { layers, matte } = build();
    const timeline = createOfferTimeline({
      gsap,
      ...layers,
      matte,
      paused: true,
    });
    expect(timeline.duration()).toBeCloseTo(offerRevealLength, 5);
    expect(timeline.duration()).toBeLessThanOrEqual(1);

    const { strokes, content, arrow } = offerRevealTiming;
    // Each stroke starts before the one before it has finished.
    expect(strokes.gap).toBeLessThan(strokes.duration);
    expect(strokes.at + 4 * strokes.gap + strokes.duration).toBeLessThan(0.8);
    expect(content.at).toBeGreaterThan(strokes.at);
    expect(arrow.at).toBeGreaterThan(content.at);
    timeline.kill();
  });

  it("paints the strokes in the variant's order", () => {
    const { layers, matte } = build("b");
    const timeline = createOfferTimeline({
      gsap,
      ...layers,
      matte,
      paused: true,
    });
    const { at, gap } = offerRevealTiming.strokes;
    matte.strokes.forEach((stroke, index) => {
      timeline.time(at + index * gap + 0.01);
      expect(stroke.group).toHaveAttribute("visibility", "visible");
      const next = matte.strokes[index + 1];
      if (next) {
        expect(next.group).toHaveAttribute("visibility", "hidden");
      }
    });
    timeline.kill();
  });

  it("only moves the stroke fronts and the three layers", () => {
    const { host, layers, matte } = build();
    const timeline = createOfferTimeline({
      gsap,
      ...layers,
      matte,
      paused: true,
    });
    const allowed = new Set<Element>(Object.values(layers));
    for (const tween of timeline.getChildren(
      true,
      true,
      false,
    ) as gsap.core.Tween[]) {
      for (const target of tween.targets<Element>()) {
        expect(allowed.has(target) || matte.svg.contains(target)).toBe(true);
        expect(host.contains(target)).toBe(true);
      }
    }
    timeline.kill();
  });

  it("ends with every stroke fully painted and unfiltered", () => {
    const { layers, matte } = build();
    const timeline = createOfferTimeline({
      gsap,
      ...layers,
      matte,
      paused: true,
    });
    timeline.progress(1);
    for (const stroke of matte.strokes) {
      expect(stroke.group).toHaveAttribute("visibility", "visible");
      expect(stroke.group).toHaveAttribute("filter", "none");
      expect(
        frontOffset(stroke.front) - STROKE_SHARPNESS,
      ).toBeGreaterThanOrEqual(1 - 1e-6);
    }
    for (const layer of Object.values(layers)) {
      expect(layer.style.opacity).toBe("1");
    }
    timeline.kill();
  });

  it("fades the paint instead where there is no matte (WebKit)", () => {
    const { layers } = build();
    const timeline = createOfferTimeline({ gsap, ...layers, paused: true });
    expect(layers.paint.style.opacity).toBe("0");
    timeline.progress(1);
    expect(layers.paint.style.opacity).toBe("1");
    expect(gsap.getTweensOf(layers.paint)).toHaveLength(1);
    timeline.kill();
  });
});
