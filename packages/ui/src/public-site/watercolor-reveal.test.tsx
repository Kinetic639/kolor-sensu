import { render, screen, waitFor } from "@testing-library/react";
import { gsap } from "gsap";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WatercolorImage } from "./watercolor-image";
import { revealProperties } from "./watercolor-reveal-timeline";

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

// Strips the markers the reveal adds, to compare the layers themselves.
function layersOf(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const name of ["data-animation", "data-reduced-motion", "data-reveal"]) {
    clone.removeAttribute(name);
  }
  return clone.outerHTML;
}

beforeEach(() => {
  mockMedia();
  // Run the ~3 s timeline quickly.
  gsap.globalTimeline.timeScale(40);
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

  it("paints in once mounted, then hands over to the static composition", async () => {
    gsap.globalTimeline.timeScale(5);
    const { container } = render(
      <WatercolorImage
        {...base}
        aspectRatio="3 / 2"
        animationPreset="watercolor-reveal"
      />,
    );
    const element = root(container);

    expect(element.dataset.reveal).toBe("waiting");
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));
    expect(inlineRevealProperties(element)).toContain(revealProperties.left);

    await waitFor(() => expect(element.dataset.reveal).toBe("done"), {
      timeout: 3000,
    });
    // Nothing of the animation is left behind; the ratio React set is kept.
    expect(inlineRevealProperties(element)).toEqual([]);
    expect(element.style.getPropertyValue("--ks-wc-ratio")).toBe("3 / 2");
    expect(gsap.getTweensOf(element)).toHaveLength(0);
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
              name === revealProperties.photoX
                ? "1"
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
    expect(gsap.getTweensOf(root(container))).toHaveLength(0);
  });

  it("stops cleanly when unmounted mid-reveal", async () => {
    gsap.globalTimeline.timeScale(1);
    const { container, unmount } = render(
      <WatercolorImage {...base} animationPreset="watercolor-reveal" />,
    );
    const element = root(container);
    await waitFor(() => expect(element.dataset.reveal).toBe("playing"));

    unmount();
    expect(gsap.getTweensOf(element)).toHaveLength(0);
  });

  it("keeps the photo the only image exposed to assistive technology", () => {
    render(<WatercolorImage {...base} animationPreset="watercolor-reveal" />);

    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAccessibleName(base.alt);
  });
});
