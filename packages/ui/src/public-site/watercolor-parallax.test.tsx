// ParallaxLayer: WatercolorImage's optional second backdrop layer, drifting
// against the page on scroll, never under reduced motion.
import { act, render } from "@testing-library/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGsap } from "./lazy-gsap";
import { PARALLAX_DRIFT, ParallaxLayer } from "./watercolor-parallax";

function mockMedia({ reduce = false } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("reduce") ? reduce : query.includes("scripting"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

async function renderLayer() {
  const { container, unmount } = render(
    <div className="ks-wc">
      <ParallaxLayer>
        <img alt="" src="/drops.png" />
      </ParallaxLayer>
    </div>,
  );
  await act(async () => {
    await loadGsap();
  });
  return {
    unmount,
    root: container.querySelector<HTMLElement>(".ks-wc")!,
    layer: container.querySelector<HTMLElement>(".ks-wc__parallax")!,
  };
}

afterEach(() => {
  // @ts-expect-error -- reset between tests; a real browser always has one.
  delete window.matchMedia;
});

describe("ParallaxLayer", () => {
  it("is decorative, hidden from assistive technology", async () => {
    const { layer } = await renderLayer();
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("stays put when scripting can't be confirmed", async () => {
    const { layer } = await renderLayer();
    expect(gsap.getTweensOf(layer)).toHaveLength(0);
    expect(layer).not.toHaveAttribute("style");
  });

  it("stays put under prefers-reduced-motion", async () => {
    mockMedia({ reduce: true });
    const { layer } = await renderLayer();
    expect(gsap.getTweensOf(layer)).toHaveLength(0);
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });

  it("drifts with the picture's travel through the viewport, motion allowed", async () => {
    mockMedia();
    const { root, layer } = await renderLayer();
    const [tween] = gsap.getTweensOf(layer);
    expect(tween).toBeDefined();
    expect(tween!.vars.yPercent).toBe(-PARALLAX_DRIFT);
    expect(tween!.scrollTrigger!.trigger).toBe(root);
  });

  it("cleans up on unmount", async () => {
    mockMedia();
    const { layer, unmount } = await renderLayer();
    unmount();
    expect(gsap.getTweensOf(layer)).toHaveLength(0);
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
