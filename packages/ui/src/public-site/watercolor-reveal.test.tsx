import { render, screen, waitFor } from "@testing-library/react";
import { gsap } from "gsap";
import { type ReactNode, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WatercolorImage } from "./watercolor-image";
import type { PaintMatte } from "./watercolor-paint-matte";
import {
  revealProperties,
  type WatercolorRevealDebug,
  WatercolorRevealDebugContext,
} from "./watercolor-reveal";

const base = {
  src: "/kolor-sensu/therapy-room-upload.png",
  alt: "Gabinet z fotelem przy oknie",
  caption: "Przestrzeń dla ważnych rozmów",
};

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

// A hand-driven IntersectionObserver: `scrollIntoView()` reports the watched
// element as visible.
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

function root(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

function inlineRevealProperties(element: HTMLElement) {
  return Object.values(revealProperties).filter(
    (name) => element.style.getPropertyValue(name) !== "",
  );
}

interface Reveal {
  matte: PaintMatte;
  timeline: gsap.core.Timeline;
}

// Records every reveal that starts, to inspect its matte and timeline.
function recordReveals() {
  const reveals: Reveal[] = [];
  const debug: WatercolorRevealDebug = {
    onReveal: (reveal) => reveals.push(reveal),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WatercolorRevealDebugContext.Provider value={debug}>
      {children}
    </WatercolorRevealDebugContext.Provider>
  );
  return { reveals, wrapper };
}

function mattes() {
  return document.querySelectorAll(".ks-wc__matte");
}

// True once nothing of this reveal is left in GSAP.
function stopped({ matte, timeline }: Reveal) {
  return (
    !timeline.isActive() &&
    [...matte.backdrop.strokes, ...matte.photo.strokes].every(
      (stroke) =>
        gsap.getTweensOf(stroke.front).length === 0 &&
        gsap.getTweensOf(stroke.group).length === 0,
    )
  );
}

// Strips the markers the reveal adds, to compare the layers themselves.
function layersOf(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const name of ["data-animation", "data-reduced-motion", "data-reveal"]) {
    clone.removeAttribute(name);
  }
  // The caption's own idle float (CaptionMotion, watercolor-caption-motion
  // .tsx) runs forever, independently of the reveal: strip its live inline
  // style so this comparison doesn't depend on the instant each side was
  // read.
  clone.querySelector(".ks-wc__caption-inner")?.removeAttribute("style");
  return clone.outerHTML;
}

beforeEach(() => {
  mockMedia();
  // Run the 1.2 s timeline quickly.
  gsap.globalTimeline.timeScale(20);
});

afterEach(() => {
  gsap.globalTimeline.timeScale(1);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WatercolorImage entrance animation", () => {
  it("is off by default: the static composition has no reveal markers", () => {
    const { container } = render(<WatercolorImage {...base} />);

    expect(root(container)).not.toHaveAttribute("data-animation");
    expect(root(container)).not.toHaveAttribute("data-reveal");
  });

  it("renders exactly the static layers, only marked for the reveal", () => {
    mockMedia({ reduce: true });
    const { container: animated } = render(
      <WatercolorImage
        {...base}
        aspectRatio="3 / 2"
        animationPreset="watercolor-reveal"
      />,
    );
    const { container: still } = render(
      <WatercolorImage {...base} aspectRatio="3 / 2" />,
    );

    expect(root(animated)).toHaveAttribute(
      "data-animation",
      "watercolor-reveal",
    );
    expect(root(animated).tagName).toBe("FIGURE");
    expect(layersOf(root(animated))).toBe(layersOf(root(still)));
  });

  it("sends the finished composition from the server, with nothing hidden inline", () => {
    const html = renderToString(
      <WatercolorImage
        {...base}
        animationPreset="watercolor-reveal"
        priority
      />,
    );

    expect(html).toContain('data-animation="watercolor-reveal"');
    expect(html).toContain('data-reduced-motion="static"');
    expect(html).toMatch(
      /class="ks-wc__backdrop" aria-hidden="true"><img alt=""[^>]+watercolor-background\.webp/,
    );
    expect(html).toMatch(
      /class="ks-wc__photo"><img alt="Gabinet z fotelem przy oknie"/,
    );
    expect(html).toContain("Przestrzeń dla ważnych rozmów");
    // The reveal state only exists once the script runs.
    expect(html).not.toContain("data-reveal");
    for (const [, inline] of html.matchAll(/style="([^"]*)"/g)) {
      expect(inline).not.toMatch(/--ks-reveal|opacity|visibility|mask|clip/);
    }
  });

  it("paints in through the matte, then hands over to the static composition", async () => {
    // Real speed while the matte is inspected, then fast to the end.
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    const { container } = render(
      <WatercolorImage
        {...base}
        aspectRatio="3 / 2"
        animationPreset="watercolor-reveal"
      />,
      { wrapper },
    );
    const element = root(container);

    expect(element.dataset.reveal).toBe("waiting");
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));
    const { matte } = reveals[0]!;
    // The real layers are masked by the matte, which lives in the root.
    expect(element.style.getPropertyValue(revealProperties.backdrop)).toBe(
      matte.backdrop.url,
    );
    expect(element.style.getPropertyValue(revealProperties.photo)).toBe(
      matte.photo.url,
    );
    expect(matte.svg.parentElement).toBe(element);

    gsap.globalTimeline.timeScale(20);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    // Nothing of the animation is left behind: no matte, no reveal values,
    // no running tweens. The ratio React set is kept.
    expect(inlineRevealProperties(element)).toEqual([]);
    expect(element.style.getPropertyValue("--ks-wc-ratio")).toBe("3 / 2");
    expect(matte.svg.isConnected).toBe(false);
    expect(mattes()).toHaveLength(0);
    expect(stopped(reveals[0]!)).toBe(true);
    expect(reveals).toHaveLength(1);
  });

  it("ends as exactly the static markup", async () => {
    const { container } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );
    const element = root(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });

    const { container: still } = render(<WatercolorImage {...base} />);
    expect(layersOf(element)).toBe(layersOf(root(still)));
  });

  it("waits until the image scrolls into view", async () => {
    const viewport = mockIntersectionObserver();
    const { container } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );
    const element = root(container);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(element.dataset.reveal).toBe("waiting");
    expect(inlineRevealProperties(element)).toEqual([]);

    viewport.scrollIntoView();
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));
  });

  it("shows the final composition at once when the visitor prefers reduced motion", () => {
    mockMedia({ reduce: true });
    const { container } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );
    const element = root(container);

    expect(element.dataset.reveal).toBe("done");
    expect(inlineRevealProperties(element)).toEqual([]);
    expect(gsap.getTweensOf(element)).toHaveLength(0);
    expect(mattes()).toHaveLength(0);
  });

  it("can instead fade in gently under reduced motion, with no painting", async () => {
    gsap.globalTimeline.timeScale(1);
    mockMedia({ reduce: true });
    const { container } = render(
      <WatercolorImage
        {...base}
        animationPreset="watercolor-reveal"
        reducedMotionMode="simple-fade"
      />,
    );
    const element = root(container);

    expect(element).toHaveAttribute("data-reduced-motion", "simple-fade");
    await waitFor(() => expect(element.dataset.reveal).toBe("fading"));
    expect(inlineRevealProperties(element)).toEqual([revealProperties.fade]);
    expect(mattes()).toHaveLength(0);

    await waitFor(() => expect(element.dataset.reveal).toBe("done"));
    expect(inlineRevealProperties(element)).toEqual([]);
  });

  it("stays static where the stylesheet cannot pre-hide the layers", () => {
    mockMedia({ scripting: false });
    const { container } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );

    expect(root(container).dataset.reveal).toBe("done");
  });

  it("does not replay after the no-script fallback has already shown the image", () => {
    const computed = window.getComputedStyle;
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const style = computed(element);
      if (!(element as HTMLElement).classList.contains("ks-wc")) return style;
      return new Proxy(style, {
        get(target, key) {
          if (key === "getPropertyValue") {
            return (name: string) =>
              name === revealProperties.hidden
                ? "none"
                : target.getPropertyValue(name);
          }
          const value = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    });
    const { container } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );

    expect(root(container).dataset.reveal).toBe("done");
    expect(mattes()).toHaveLength(0);
  });

  it("stops cleanly when unmounted mid-reveal", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    const { container, unmount } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
      { wrapper },
    );
    const element = root(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));

    unmount();
    expect(stopped(reveals[0]!)).toBe(true);
    expect(reveals[0]!.matte.svg.isConnected).toBe(false);
    expect(inlineRevealProperties(element)).toEqual([]);

    // Nothing runs afterwards: the reveal never completes.
    gsap.globalTimeline.timeScale(20);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(element.dataset.reveal).toBe("playing");
  });

  it("never runs two reveals at once: replay and strict mode start one", async () => {
    gsap.globalTimeline.timeScale(1);
    const { reveals, wrapper } = recordReveals();
    const view = (replay: number) => (
      <StrictMode>
        <WatercolorImage
          key={replay}
          {...base}
          animationPreset="watercolor-reveal"
        />
      </StrictMode>
    );
    const { container, rerender } = render(view(1), { wrapper });
    await waitFor(() => expect(root(container).dataset.reveal).toBe("playing"));
    expect(reveals).toHaveLength(1);
    expect(mattes()).toHaveLength(1);

    // Replay (Storybook remounts the image).
    rerender(view(2));
    await waitFor(() => expect(reveals).toHaveLength(2));
    expect(stopped(reveals[0]!)).toBe(true);
    expect(mattes()).toHaveLength(1);
    expect(root(container).contains(reveals[1]!.matte.svg)).toBe(true);

    gsap.globalTimeline.timeScale(20);
    await waitFor(() => expect(root(container).dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    expect(mattes()).toHaveLength(0);
    expect(reveals).toHaveLength(2);
  });

  it("keeps Safari on the static composition (no SVG masks on HTML there)", () => {
    vi.stubGlobal("CSS", {
      supports: (property: string, value: string) =>
        property === "font" && value === "-apple-system-body",
    });
    const { container } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );

    expect(root(container).dataset.reveal).toBe("done");
    expect(mattes()).toHaveLength(0);
  });

  it("keeps the photo the only image exposed to assistive technology", async () => {
    const { container } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );
    await waitFor(() => expect(root(container).dataset.reveal).toBe("playing"));

    // The matte is aria-hidden; the photo keeps its alt text throughout.
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAccessibleName(base.alt);
  });
});
