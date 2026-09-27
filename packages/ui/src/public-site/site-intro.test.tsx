import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { introRemaining, watchReveal } from "./reveal-support";
import { introStorageKey, SiteIntro } from "./site-intro";
import { SiteLayout } from "./site-layout";
import { sampleContact, sampleNavigation } from "./site-samples";

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

// React does not run the inline script when rendering on the client, so the
// tests run it themselves, as the browser does while parsing the page.
function load() {
  const { container, unmount } = render(<SiteIntro />);
  const script = container.querySelector("script")!;
  new Function(script.textContent!)();
  const intro = container.querySelector<HTMLElement>(".ks-intro")!;
  return { intro, unmount };
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("SiteIntro", () => {
  it("is in the server HTML hidden, decorative, with its script right after it", () => {
    const html = renderToString(<SiteIntro />);
    expect(html).toMatch(
      /^<div id="ks-intro" class="ks-intro" aria-hidden="true">.*<\/div><script>/,
    );
    expect(html).not.toContain("data-intro");
    // Not preloaded or fetched while hidden: returning visitors pay nothing.
    expect(html).toContain('loading="lazy"');
    expect(html).toContain(introStorageKey);
  });

  it("comes first in the layout, before the skip link", () => {
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

  it("plays on the first visit only", () => {
    mockMedia();
    const first = load();
    expect(first.intro.dataset.intro).toBe("play");
    expect(Number(first.intro.dataset.introAt)).toBeGreaterThanOrEqual(0);
    expect(window.localStorage.getItem(introStorageKey)).toBe("1");
    first.unmount();

    const again = load();
    expect(again.intro.dataset.intro).toBeUndefined();
  });

  it("does not play under reduced motion", () => {
    mockMedia({ reduce: true });
    expect(load().intro.dataset.intro).toBeUndefined();
  });

  it("does not play where storage is blocked (it would play on every page)", () => {
    mockMedia();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(load().intro.dataset.intro).toBeUndefined();
  });

  it("can be replayed for Storybook without a script", () => {
    const { container } = render(<SiteIntro replay />);
    expect(container.querySelector(".ks-intro")).toHaveAttribute(
      "data-intro",
      "play",
    );
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("reveals and the intro", () => {
  it("hold a visible reveal back until the intro starts to fade", () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockReturnValue(300);
    const { container } = render(<SiteIntro replay />);
    const intro = container.querySelector<HTMLElement>(".ks-intro")!;
    intro.dataset.introAt = "200";
    // Starts at 200 ms, hands over at 1.3 s: 1 s from now.
    expect(introRemaining()).toBe(1000);

    vi.stubGlobal("IntersectionObserver", undefined);
    const near = vi.fn();
    const visible = vi.fn();
    watchReveal(document.body, { threshold: 0.3, near, visible });
    expect(near).toHaveBeenCalledOnce();
    expect(visible).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(visible).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("start at once when there is no intro", () => {
    expect(introRemaining()).toBe(0);
    vi.stubGlobal("IntersectionObserver", undefined);
    const visible = vi.fn();
    watchReveal(document.body, { threshold: 0.3, near: vi.fn(), visible });
    expect(visible).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
