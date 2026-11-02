import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import {
  createPaintMatte,
  createPaintTimeline,
} from "./watercolor-paint-matte";
import { circularPaintMap } from "./circular-paint-matte";

afterEach(() => {
  gsap.globalTimeline.clear();
  document.body.replaceChildren();
});
describe("circular matte assets in the shared watercolor engine", () => {
  it.each(["rings", "paired", "sweep", "spiral-out", "spiral-in"] as const)(
    "uses two raster time maps and no animated paths for %s",
    (variant) => {
      const host = document.createElement("div");
      document.body.append(host);
      const options = { variant, direction: "clockwise" as const };
      const matte = createPaintMatte(host, options);
      expect(matte.svg.querySelectorAll("path")).toHaveLength(0);
      expect(matte.svg.querySelectorAll("feColorMatrix")).toHaveLength(2);
      expect(matte.svg.querySelectorAll("image")).toHaveLength(2);
      expect(matte.svg.querySelector("image")).toHaveAttribute(
        "href",
        circularPaintMap(options),
      );
      const timeline = createPaintTimeline(matte, { gsap, paused: true });
      const initialPhoto = matte.photo.front.getAttribute("values");
      expect(timeline.duration()).toBeCloseTo(0.42);
      timeline.time(1.4 / 6);
      expect(matte.photo.front.getAttribute("values")).toBe(initialPhoto);
      expect(matte.backdrop.strokes[0]!.group).toHaveAttribute(
        "filter",
        "none",
      );
      timeline.progress(0.4);
      expect(matte.photo.group.getAttribute("filter")).not.toBe("none");
      timeline.progress(1);
      expect(matte.photo.group).toHaveAttribute("filter", "none");
      expect(matte.backdrop.strokes[0]!.group).toHaveAttribute(
        "filter",
        "none",
      );
    },
  );
  it("selects a baked opposite-direction asset, without reversing playback", () => {
    expect(
      circularPaintMap({ variant: "rings", direction: "clockwise" }),
    ).not.toBe(
      circularPaintMap({ variant: "rings", direction: "counterclockwise" }),
    );
  });
  it.each(["pigment", "brushed-wipe"] as const)(
    "finishes paint before revealing the photo for %s",
    (variant) => {
      const host = document.createElement("div");
      const matte = createPaintMatte(host, { variant, direction: "clockwise" });
      const timeline = createPaintTimeline(matte, { gsap, paused: true });
      const initial = matte.photo.front.getAttribute("values");
      timeline.time(0.2);
      expect(matte.photo.front.getAttribute("values")).toBe(initial);
      expect(matte.backdrop.strokes[0]!.group).toHaveAttribute(
        "filter",
        "none",
      );
      expect(timeline.duration()).toBeCloseTo(0.48);
      timeline.progress(1);
      expect(matte.photo.group).toHaveAttribute("filter", "none");
    },
  );
  it.each(["clockwise", "counterclockwise"] as const)(
    "reveals both orbital layers together in opposite directions (%s)",
    (direction) => {
      const host = document.createElement("div");
      const matte = createPaintMatte(host, {
        variant: "star-trails",
        direction,
      });
      const timeline = createPaintTimeline(matte, { gsap, paused: true });
      const initial = matte.photo.front.getAttribute("values");
      const initialBackdrop =
        matte.backdrop.strokes[0]!.front.getAttribute("values");
      timeline.time(0.25);
      expect(matte.photo.front.getAttribute("values")).not.toBe(initial);
      expect(matte.backdrop.strokes[0]!.front.getAttribute("values")).not.toBe(
        initialBackdrop,
      );
      const images = matte.svg.querySelectorAll("image");
      const options = { variant: "star-trails" as const, direction };
      expect(images[0]).toHaveAttribute(
        "href",
        circularPaintMap(options, "backdrop"),
      );
      expect(images[1]).toHaveAttribute(
        "href",
        circularPaintMap(options, "photo"),
      );
      expect(images[0]!.getAttribute("href")).not.toBe(
        images[1]!.getAttribute("href"),
      );
      expect(matte.svg.querySelectorAll("path")).toHaveLength(0);
      expect(matte.svg.querySelectorAll("image")).toHaveLength(2);
      expect(matte.svg.querySelectorAll("feGaussianBlur")).toHaveLength(2);
      for (const blur of matte.svg.querySelectorAll("feGaussianBlur")) {
        expect(blur).toHaveAttribute("stdDeviation", "1.8");
      }
      expect(timeline.duration()).toBeCloseTo(0.8);
      timeline.progress(1);
      expect(matte.photo.group).toHaveAttribute("filter", "none");
    },
  );
});
