// CaptionMotion: the handwritten caption's own idle float and scroll
// parallax, independent of WatercolorImage's entrance animation (which only
// fades the caption in, via opacity, and may not even be in use).
import { render } from "@testing-library/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CaptionMotion } from "./watercolor-caption-motion";

// jsdom has no matchMedia; each test says which preferences the visitor has.
// Omitting a call leaves window.matchMedia undefined, as in a browser where
// the "scripting" media feature cannot be read at all.
function mockMedia({ reduce = false, scripting = true } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("reduce")
      ? reduce
      : query.includes("scripting")
        ? scripting
        : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderCaption() {
  const { container, unmount } = render(
    <CaptionMotion>Przestrzeń dla ważnych rozmów</CaptionMotion>,
  );
  return {
    unmount,
    outer: container.querySelector<HTMLElement>(".ks-wc__caption")!,
    inner: container.querySelector<HTMLElement>(".ks-wc__caption-inner")!,
  };
}

afterEach(() => {
  // @ts-expect-error -- reset between tests; a real browser always has one.
  delete window.matchMedia;
});

describe("CaptionMotion", () => {
  it("renders the caption text in a figcaption, motion aside", () => {
    const { outer, inner } = renderCaption();
    expect(outer.tagName).toBe("FIGCAPTION");
    expect(outer).toHaveClass("ks-wc__caption");
    expect(inner).toHaveTextContent("Przestrzeń dla ważnych rozmów");
  });

  it("stays put when scripting can't be confirmed (no matchMedia at all)", () => {
    const { outer, inner } = renderCaption();
    expect(gsap.getTweensOf(inner)).toHaveLength(0);
    expect(gsap.getTweensOf(outer)).toHaveLength(0);
    expect(outer).not.toHaveAttribute("style");
    expect(inner).not.toHaveAttribute("style");
  });

  it("stays put under prefers-reduced-motion", () => {
    mockMedia({ reduce: true });
    const { outer, inner } = renderCaption();
    expect(gsap.getTweensOf(inner)).toHaveLength(0);
    expect(gsap.getTweensOf(outer)).toHaveLength(0);
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });

  it("floats gently and ties a tiny scroll parallax to itself, motion allowed", () => {
    mockMedia();
    const { outer, inner } = renderCaption();

    // The idle float: a slow, small, endless drift on the inner layer only.
    const [float] = gsap.getTweensOf(inner);
    expect(float).toBeDefined();
    expect(float!.repeat()).toBe(-1);
    expect(float!.vars.yoyo).toBe(true);
    expect(Math.abs(Number(float!.vars.y))).toBeLessThanOrEqual(6);

    // The scroll parallax: tied to the outer element, a few pixels, never
    // fighting the idle float over the same property.
    const [parallax] = gsap.getTweensOf(outer);
    expect(parallax).toBeDefined();
    expect(parallax!.scrollTrigger).toBeDefined();
    expect(parallax!.scrollTrigger!.trigger).toBe(outer);
    expect(ScrollTrigger.getAll()).toHaveLength(1);
  });

  it("cleans up on unmount: no leftover tweens or ScrollTrigger", () => {
    mockMedia();
    const { outer, inner, unmount } = renderCaption();
    expect(gsap.getTweensOf(inner).length).toBeGreaterThan(0);

    unmount();

    expect(gsap.getTweensOf(inner)).toHaveLength(0);
    expect(gsap.getTweensOf(outer)).toHaveLength(0);
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
