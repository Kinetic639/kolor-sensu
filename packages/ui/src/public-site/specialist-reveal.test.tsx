import { render, waitFor } from "@testing-library/react";
import { gsap } from "gsap";
import { type ReactNode, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistWatercolorCard } from "./specialist-card";
import {
  type SpecialistRevealDebug,
  SpecialistRevealDebugContext,
} from "./specialist-reveal";
import { sampleSpecialists } from "./specialist-samples";
import type { SplashMatte } from "./specialist-splash-matte";

const [anna] = sampleSpecialists;
const layerSelector =
  ".ks-sp__portrait, .ks-sp__splash, .ks-sp__stain, .ks-sp__plate";

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
  // As a real one: an observer made once the element is on screen
  // reports it at once.
  let visible = false;
  class Observer {
    targets: Element[] = [];
    constructor(public callback: IntersectionObserverCallback) {
      observers.push(this);
    }
    observe(target: Element) {
      this.targets.push(target);
      if (visible) {
        queueMicrotask(() =>
          this.callback(
            [{ target, isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
        );
      }
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
      visible = true;
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
  matte?: SplashMatte;
  timeline: gsap.core.Timeline;
}

function recordReveals() {
  const reveals: Reveal[] = [];
  const debug: SpecialistRevealDebug = {
    onReveal: (reveal) => reveals.push(reveal),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SpecialistRevealDebugContext.Provider value={debug}>
      {children}
    </SpecialistRevealDebugContext.Provider>
  );
  return { reveals, wrapper };
}

function card(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".ks-sp")!;
}

// No inline style the reveal could have left behind.
function inlineStyles(element: HTMLElement) {
  return [element, ...element.querySelectorAll<HTMLElement>(layerSelector)]
    .map((node) => node.getAttribute("style"))
    .filter((style) => style !== null);
}

function mattes() {
  return document.querySelectorAll(".ks-sp__matte");
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

describe("SpecialistWatercolorCard entrance animation", () => {
  it("blooms the splash through the matte, then hands over to the static card", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
      { wrapper },
    );
    const element = card(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));

    const { matte } = reveals[0]!;
    const splash = element.querySelector<HTMLElement>(".ks-sp__splash")!;
    expect(matte).toBeDefined();
    expect(splash.style.getPropertyValue("mask-image")).toContain(
      matte!.mask.id,
    );
    expect(matte!.svg.parentElement).toBe(element);

    gsap.globalTimeline.timeScale(20);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    expect(inlineStyles(element)).toEqual([]);
    expect(mattes()).toHaveLength(0);
    expect(reveals).toHaveLength(1);
  });

  it("ends as exactly the static card", async () => {
    const { container } = render(
      <SpecialistWatercolorCard
        {...anna}
        as="div"
        animationPreset="splash-reveal"
      />,
    );
    const element = card(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    const { container: still } = render(
      <SpecialistWatercolorCard {...anna} as="div" />,
    );
    const clone = element.cloneNode(true) as HTMLElement;
    for (const name of [
      "data-animation",
      "data-reduced-motion",
      "data-reveal",
    ]) {
      clone.removeAttribute(name);
    }
    expect(clone.outerHTML).toBe(card(still).outerHTML);
  });

  it("waits until the card scrolls into view, then plays once", async () => {
    const viewport = mockIntersectionObserver();
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
      { wrapper },
    );
    const element = card(container);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(element.dataset.reveal).toBe("waiting");

    viewport.scrollIntoView();
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    // Scrolling past it again does not replay it.
    viewport.scrollIntoView();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(reveals).toHaveLength(1);
  });

  it("waits for its stagger delay before it starts", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    render(
      <SpecialistWatercolorCard
        {...anna}
        animationPreset="splash-reveal"
        revealDelay={0.24}
      />,
      { wrapper },
    );
    await waitFor(() => expect(reveals).toHaveLength(1));
    expect(reveals[0]!.timeline.delay()).toBeCloseTo(0.24);
  });

  it("shows the finished card at once when the visitor prefers reduced motion", () => {
    mockMedia({ reduce: true });
    const { container } = render(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
    );
    expect(card(container).dataset.reveal).toBe("done");
    expect(inlineStyles(card(container))).toEqual([]);
    expect(mattes()).toHaveLength(0);
  });

  it("can instead fade in gently under reduced motion, with no blooming", async () => {
    mockMedia({ reduce: true });
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <SpecialistWatercolorCard
        {...anna}
        animationPreset="splash-reveal"
        reducedMotionMode="simple-fade"
      />,
      { wrapper },
    );
    const element = card(container);
    await waitFor(() =>
      expect(["fading", "done"]).toContain(element.dataset.reveal),
    );
    await waitFor(() => expect(element.dataset.reveal).toBe("done"));
    expect(reveals).toHaveLength(0);
    expect(mattes()).toHaveLength(0);
    expect(inlineStyles(element)).toEqual([]);
  });

  it("fades the splash instead of blooming it in Safari (no SVG masks on HTML)", async () => {
    vi.stubGlobal("CSS", {
      supports: (property: string, value: string) =>
        property === "font" && value === "-apple-system-body",
    });
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
      { wrapper },
    );
    const element = card(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    expect(reveals[0]!.matte).toBeUndefined();
    expect(mattes()).toHaveLength(0);
  });

  it("does not replay after the no-script fallback has already shown the card", () => {
    // The fallback fires 3 s after the page loads; the script came later.
    vi.spyOn(performance, "now").mockReturnValue(5000);
    const style = document.createElement("style");
    style.textContent = ".ks-sp { --ks-sp-hidden: 1; }";
    document.head.append(style);
    const { container } = render(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
    );
    expect(card(container).dataset.reveal).toBe("done");
    style.remove();
  });

  it("does not read computed styles before the fallback could have fired", () => {
    vi.spyOn(performance, "now").mockReturnValue(500);
    const computed = vi.spyOn(window, "getComputedStyle");
    const { container } = render(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
    );
    expect(card(container).dataset.reveal).toBe("waiting");
    expect(computed).not.toHaveBeenCalled();
  });

  it("stops cleanly when unmounted mid-reveal", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    const { container, unmount } = render(
      <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />,
      { wrapper },
    );
    const element = card(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));

    unmount();
    const { matte, timeline } = reveals[0]!;
    expect(timeline.isActive()).toBe(false);
    expect(matte!.svg.isConnected).toBe(false);
    expect(inlineStyles(element)).toEqual([]);
    expect(gsap.getTweensOf(matte!.front)).toHaveLength(0);
  });

  it("never runs two reveals at once in strict mode", async () => {
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <StrictMode>
        <SpecialistWatercolorCard {...anna} animationPreset="splash-reveal" />
      </StrictMode>,
      { wrapper },
    );
    await waitFor(() => expect(card(container).dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    expect(reveals).toHaveLength(1);
    expect(mattes()).toHaveLength(0);
  });
});
