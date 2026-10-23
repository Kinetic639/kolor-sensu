import { act, render } from "@testing-library/react";
import { gsap } from "gsap";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INTRO_HANDOFF } from "./intro-motion";
import { introRemaining, watchReveal } from "./reveal-support";
import { introStorageKey, SiteIntro } from "./site-intro";
import { SiteLayout } from "./site-layout";
import { sampleContact, sampleNavigation } from "./site-samples";
import { loadGsap } from "./lazy-gsap";

// jsdom has no matchMedia.
function mockMedia({ reduce = false } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("reduce") ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/** GSAP has arrived and the animation has set itself up (useLazyGsap). */
const gsapLoaded = () =>
  act(async () => {
    await loadGsap();
  });

// React does not run the inline script when rendering on the client, so the
// tests run it themselves, as the browser does while parsing the page.
async function load() {
  const { container, unmount } = render(<SiteIntro />);
  const script = container.querySelector("script")!;
  new Function(script.textContent!)();
  const intro = container.querySelector<HTMLElement>(".ks-intro")!;
  await gsapLoaded();
  return { intro, unmount };
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("SiteIntro", () => {
  it("is in the server HTML hidden, decorative, with its script right after it", async () => {
    const html = renderToString(<SiteIntro />);
    expect(html).toMatch(
      /^<div id="ks-intro" class="ks-intro" aria-hidden="true">.*<\/div><script>/,
    );
    expect(html).not.toContain("data-intro");
    expect(html).toContain(introStorageKey);
  });

  it("draws the closed bud and the greeting in the markup, for the first paint", async () => {
    const { container } = render(<SiteIntro />);
    const intro = container.querySelector<HTMLElement>(".ks-intro")!;
    // The penguin and its bud: two top and two middle petals, turned in.
    expect(intro.querySelector("svg.ks-intro__penguin")).not.toBeNull();
    const petals = intro.querySelectorAll(".ks-intro__petal");
    expect(petals).toHaveLength(4);
    for (const petal of petals) {
      expect(petal.getAttribute("transform")).toMatch(/rotate\(-?\d/);
    }
    expect(intro.querySelector(".ks-intro__centre-leaf")).not.toBeNull();
    // "Witaj", one span per letter for the motion.
    expect(intro.querySelector(".ks-intro__greeting")).toHaveTextContent(
      "Witaj",
    );
    expect(intro.querySelectorAll(".ks-intro__letter")).toHaveLength(5);
    // Not playing: nothing for the motion to do.
    expect(intro).not.toHaveAttribute("data-motion");
  });

  it("comes first in the layout, before the skip link", async () => {
    const html = renderToString(
      <SiteLayout navigation={sampleNavigation} contact={sampleContact}>
        <h1>Strona</h1>
      </SiteLayout>,
    );
    expect(html.indexOf('class="ks-intro"')).toBeLessThan(
      html.indexOf("Przejdź do treści"),
    );
    const without = renderToString(
      <SiteLayout
        navigation={sampleNavigation}
        contact={sampleContact}
        intro={false}
      >
        <h1>Strona</h1>
      </SiteLayout>,
    );
    expect(without).not.toContain("ks-intro");
  });

  it("plays on the first visit only", async () => {
    mockMedia();
    const first = await load();
    expect(first.intro.dataset.intro).toBe("play");
    expect(Number(first.intro.dataset.introAt)).toBeGreaterThanOrEqual(0);
    expect(window.sessionStorage.getItem(introStorageKey)).toBe("1");
    first.unmount();

    const again = await load();
    expect(again.intro.dataset.intro).toBeUndefined();
  });

  it("does not play under reduced motion", async () => {
    mockMedia({ reduce: true });
    expect((await load()).intro.dataset.intro).toBeUndefined();
  });

  it("does not play where storage is blocked (it would play on every page)", async () => {
    mockMedia();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect((await load()).intro.dataset.intro).toBeUndefined();
  });

  it("can be replayed for Storybook without a script", async () => {
    const { container } = render(<SiteIntro replay />);
    expect(container.querySelector(".ks-intro")).toHaveAttribute(
      "data-intro",
      "play",
    );
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("IntroMotion", () => {
  it("takes over a playing intro and records when its paper starts to fade", async () => {
    vi.spyOn(performance, "now").mockReturnValue(500);
    const { container, unmount } = render(<SiteIntro replay />);
    await gsapLoaded();
    const intro = container.querySelector<HTMLElement>(".ks-intro")!;
    expect(intro.dataset.motion).toBe("on");
    expect(Number(intro.dataset.introEnd)).toBe(500 + INTRO_HANDOFF * 1000);
    // The eyes morph by tweening their path data.
    const eye = intro.querySelector(".ks-intro__eye")!;
    expect(gsap.getTweensOf(eye).length).toBeGreaterThan(0);
    unmount();
  });

  it("leaves an intro that does not play alone", async () => {
    const { container } = render(<SiteIntro />);
    const intro = container.querySelector<HTMLElement>(".ks-intro")!;
    expect(intro).not.toHaveAttribute("data-motion");
    expect(intro).not.toHaveAttribute("data-intro-end");
  });
});

describe("reveals and the intro", () => {
  it("hold a visible reveal back until the intro starts to fade", async () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockReturnValue(300);
    const { container } = render(<SiteIntro replay />);
    const intro = container.querySelector<HTMLElement>(".ks-intro")!;
    // The motion recorded when the paper starts to fade: 1 s from now.
    intro.dataset.introEnd = "1300";
    expect(introRemaining()).toBe(1000);

    vi.stubGlobal("IntersectionObserver", undefined);
    const near = vi.fn();
    const visible = vi.fn();
    watchReveal(document.body, { threshold: 0.3, near, visible });
    expect(near).toHaveBeenCalledOnce();
    expect(visible).not.toHaveBeenCalled();
    vi.spyOn(performance, "now").mockReturnValue(1300);
    vi.advanceTimersByTime(1000);
    expect(visible).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("wait for the stylesheet's fallback fade while the motion has not started", async () => {
    vi.spyOn(performance, "now").mockReturnValue(300);
    const { container } = render(<SiteIntro replay />);
    const intro = container.querySelector<HTMLElement>(".ks-intro")!;
    delete intro.dataset.introEnd;
    intro.dataset.introAt = "200";
    // Started at 200 ms, the fallback fade begins at 4.2 s.
    expect(introRemaining()).toBe(3900);
  });

  it("wait longer when the intro's end moves while they wait", async () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockReturnValue(0);
    const { container } = render(<SiteIntro replay />);
    const intro = container.querySelector<HTMLElement>(".ks-intro")!;
    intro.dataset.introEnd = "500";
    vi.stubGlobal("IntersectionObserver", undefined);
    const visible = vi.fn();
    watchReveal(document.body, { threshold: 0.3, near: vi.fn(), visible });
    intro.dataset.introEnd = "900";
    vi.spyOn(performance, "now").mockReturnValue(500);
    vi.advanceTimersByTime(500);
    expect(visible).not.toHaveBeenCalled();
    vi.spyOn(performance, "now").mockReturnValue(900);
    vi.advanceTimersByTime(400);
    expect(visible).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("start at once when there is no intro", async () => {
    expect(introRemaining()).toBe(0);
    vi.stubGlobal("IntersectionObserver", undefined);
    const visible = vi.fn();
    watchReveal(document.body, { threshold: 0.3, near: vi.fn(), visible });
    expect(visible).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
