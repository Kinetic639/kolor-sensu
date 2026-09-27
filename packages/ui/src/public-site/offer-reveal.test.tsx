import { render, waitFor } from "@testing-library/react";
import { gsap } from "gsap";
import { type ReactNode, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OfferMatte } from "./offer-brush-matte";
import { type OfferRevealDebug, OfferRevealDebugContext } from "./offer-reveal";
import { sampleServices } from "./offer-samples";
import { OfferTile } from "./offer-tile";

const [individual] = sampleServices;
const layerSelector = ".ks-of__paint, .ks-of__content, .ks-of__arrow";

// jsdom has no matchMedia; each test says which preferences the visitor has.
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

function mockIntersectionObserver() {
  const observers: Array<{
    callback: IntersectionObserverCallback;
    targets: Element[];
  }> = [];
  class Observer {
    targets: Element[] = [];
    constructor(public callback: IntersectionObserverCallback) {
      observers.push(this);
    }
    observe(target: Element) {
      this.targets.push(target);
    }
    unobserve() {}
    disconnect() {
      this.targets = [];
    }
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  return {
    scrollIntoView() {
      for (const observer of observers) {
        observer.callback(
          observer.targets.map(
            (target) =>
              ({ target, isIntersecting: true }) as IntersectionObserverEntry,
          ),
          observer as unknown as IntersectionObserver,
        );
      }
    },
  };
}

interface Reveal {
  matte?: OfferMatte;
  timeline: gsap.core.Timeline;
}

function recordReveals() {
  const reveals: Reveal[] = [];
  const debug: OfferRevealDebug = {
    onReveal: (reveal) => reveals.push(reveal),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <OfferRevealDebugContext.Provider value={debug}>
      {children}
    </OfferRevealDebugContext.Provider>
  );
  return { reveals, wrapper };
}

function tile(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".ks-of")!;
}

// Inline styles the reveal could have left behind (the paint frame's
// geometry is part of the static tile, so it is not counted).
function inlineStyles(element: HTMLElement) {
  return [element, ...element.querySelectorAll<HTMLElement>(layerSelector)]
    .map((node) => node.getAttribute("style"))
    .filter((style) => style !== null);
}

function mattes() {
  return document.querySelectorAll(".ks-of__matte");
}

beforeEach(() => {
  mockMedia();
  gsap.globalTimeline.timeScale(20);
});

afterEach(() => {
  gsap.globalTimeline.timeScale(1);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OfferTile entrance animation", () => {
  it("paints the patch through the brush matte, then hands over to the static tile", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
      { wrapper },
    );
    const element = tile(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));

    const { matte } = reveals[0]!;
    const paint = element.querySelector<HTMLElement>(".ks-of__paint")!;
    expect(matte).toBeDefined();
    expect(paint.style.getPropertyValue("mask-image")).toContain(
      matte!.mask.id,
    );
    expect(matte!.svg.parentElement).toBe(element);

    gsap.globalTimeline.timeScale(20);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    expect(inlineStyles(element)).toEqual([]);
    expect(mattes()).toHaveLength(0);
  });

  it("ends as exactly the static tile", async () => {
    const { container } = render(
      <OfferTile {...individual} as="div" animationPreset="brush-reveal" />,
    );
    const element = tile(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    const { container: still } = render(<OfferTile {...individual} as="div" />);
    const clone = element.cloneNode(true) as HTMLElement;
    for (const name of [
      "data-animation",
      "data-reduced-motion",
      "data-reveal",
    ]) {
      clone.removeAttribute(name);
    }
    expect(clone.outerHTML).toBe(tile(still).outerHTML);
  });

  it("uses the variant it is given: even tiles paint bottom to top", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    render(
      <OfferTile {...individual} animationPreset="brush-reveal" matte="b" />,
      { wrapper },
    );
    await waitFor(() => expect(reveals).toHaveLength(1));
    const group = reveals[0]!.matte!.strokes[0]!.group;
    const frame = group.querySelector("svg")!;
    // The first stroke painted is the lowest band.
    const firstY = Number(frame.getAttribute("y"));
    const lastY = Number(
      reveals[0]!
        .matte!.strokes.at(-1)!
        .group.querySelector("svg")!
        .getAttribute("y"),
    );
    expect(firstY).toBeGreaterThan(lastY);
  });

  it("waits until the tile scrolls into view, then plays once", async () => {
    const viewport = mockIntersectionObserver();
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
      { wrapper },
    );
    const element = tile(container);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(element.dataset.reveal).toBe("waiting");

    viewport.scrollIntoView();
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    viewport.scrollIntoView();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(reveals).toHaveLength(1);
  });

  it("waits for its stagger delay before it starts", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    render(
      <OfferTile
        {...individual}
        animationPreset="brush-reveal"
        revealDelay={0.2}
      />,
      { wrapper },
    );
    await waitFor(() => expect(reveals).toHaveLength(1));
    expect(reveals[0]!.timeline.delay()).toBeCloseTo(0.2);
  });

  it("shows the finished tile at once when the visitor prefers reduced motion", () => {
    mockMedia({ reduce: true });
    const { container } = render(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
    );
    expect(tile(container).dataset.reveal).toBe("done");
    expect(inlineStyles(tile(container))).toEqual([]);
    expect(mattes()).toHaveLength(0);
  });

  it("can instead fade in gently under reduced motion, with no painting", async () => {
    mockMedia({ reduce: true });
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <OfferTile
        {...individual}
        animationPreset="brush-reveal"
        reducedMotionMode="simple-fade"
      />,
      { wrapper },
    );
    const element = tile(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"));
    expect(reveals).toHaveLength(0);
    expect(mattes()).toHaveLength(0);
    expect(inlineStyles(element)).toEqual([]);
  });

  it("fades the paint instead of painting it in Safari (no SVG masks on HTML)", async () => {
    vi.stubGlobal("CSS", {
      supports: (property: string, value: string) =>
        property === "font" && value === "-apple-system-body",
    });
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
      { wrapper },
    );
    await waitFor(() => expect(tile(container).dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    expect(reveals[0]!.matte).toBeUndefined();
    expect(mattes()).toHaveLength(0);
  });

  it("does not replay after the no-script fallback has already shown the tile", () => {
    // The fallback fires 3 s after the page loads; the script came later.
    vi.spyOn(performance, "now").mockReturnValue(5000);
    const style = document.createElement("style");
    style.textContent = ".ks-of { --ks-of-hidden: 1; }";
    document.head.append(style);
    const { container } = render(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
    );
    expect(tile(container).dataset.reveal).toBe("done");
    style.remove();
  });

  it("does not read computed styles before the fallback could have fired", () => {
    vi.spyOn(performance, "now").mockReturnValue(500);
    const computed = vi.spyOn(window, "getComputedStyle");
    const { container } = render(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
    );
    expect(tile(container).dataset.reveal).toBe("waiting");
    expect(computed).not.toHaveBeenCalled();
  });

  it("stops cleanly when unmounted mid-reveal", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    const { container, unmount } = render(
      <OfferTile {...individual} animationPreset="brush-reveal" />,
      { wrapper },
    );
    const element = tile(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));

    unmount();
    const { matte, timeline } = reveals[0]!;
    expect(timeline.isActive()).toBe(false);
    expect(matte!.svg.isConnected).toBe(false);
    expect(inlineStyles(element)).toEqual([]);
    for (const stroke of matte!.strokes) {
      expect(gsap.getTweensOf(stroke.front)).toHaveLength(0);
    }
  });

  it("never runs two reveals at once in strict mode", async () => {
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <StrictMode>
        <OfferTile {...individual} animationPreset="brush-reveal" />
      </StrictMode>,
      { wrapper },
    );
    await waitFor(() => expect(tile(container).dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    expect(reveals).toHaveLength(1);
    expect(mattes()).toHaveLength(0);
  });
});
