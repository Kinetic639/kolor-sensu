// CursorRing: a hairline ring trailing the mouse that stretches like a
// spring (cursor-ring-motion.ts), steps aside over links and turns into a
// "Zobacz" disc over cards. Only for a mouse, never under reduced motion.
import { act, render } from "@testing-library/react";
import { gsap } from "gsap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CursorRing } from "./cursor-ring";
import { loadGsap } from "./lazy-gsap";

// jsdom has no matchMedia; each test says what the visitor's device and
// preferences are.
function mockMedia({ fine = true, reduce = false } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("reduce")
      ? reduce
      : query.includes("pointer: fine")
        ? fine
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

// jsdom has no PointerEvent; a mouse event that says which pointer it is.
function point(
  target: EventTarget,
  type: string,
  { x = 0, y = 0, pointerType = "mouse" } = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
}

/** GSAP has arrived and the animation has set itself up (useLazyGsap). */
const gsapLoaded = () =>
  act(async () => {
    await loadGsap();
  });

async function renderRing(page: React.ReactNode = null) {
  const { container, unmount } = render(
    <>
      {page}
      <CursorRing />
    </>,
  );
  // GSAP comes with the first mouse move (lazy-gsap.ts); the ring follows
  // from the next one.
  point(window, "pointermove", { x: 0, y: 0 });
  await gsapLoaded();
  return {
    container,
    unmount,
    cursor: container.querySelector<HTMLElement>(".ks-cursor")!,
    ring: container.querySelector<HTMLElement>(".ks-cursor__ring")!,
    label: container.querySelector<HTMLElement>(".ks-cursor__label")!,
  };
}

let tick: (() => void) | undefined;

beforeEach(() => {
  tick = undefined;
  vi.spyOn(gsap.ticker, "add").mockImplementation((callback) => {
    tick = callback as () => void;
    return callback;
  });
  vi.spyOn(gsap.ticker, "remove");
  vi.spyOn(gsap.ticker, "deltaRatio").mockReturnValue(1);
});

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error -- reset between tests; a real browser always has one.
  delete window.matchMedia;
});

describe("CursorRing", () => {
  it("is decoration only, hidden until the mouse moves", async () => {
    const { cursor } = await renderRing();
    expect(cursor).toHaveAttribute("aria-hidden", "true");
    expect(cursor.dataset.state).toBe("away");
  });

  it.each([
    ["the device has no mouse", { fine: false }],
    ["the visitor prefers reduced motion", { reduce: true }],
  ])("stays away when %s", async (_, media) => {
    mockMedia(media);
    const { cursor } = await renderRing();
    point(window, "pointermove", { x: 10, y: 10 });
    expect(cursor.dataset.state).toBe("away");
    expect(gsap.ticker.add).not.toHaveBeenCalled();
  });

  it("stays away when the media features can't be read at all", async () => {
    const { cursor } = await renderRing();
    point(window, "pointermove", { x: 10, y: 10 });
    expect(cursor.dataset.state).toBe("away");
  });

  it("ignores touch, follows the mouse", async () => {
    mockMedia();
    const { cursor } = await renderRing();
    point(window, "pointermove", { x: 10, y: 10, pointerType: "touch" });
    expect(cursor.dataset.state).toBe("away");
    point(window, "pointermove", { x: 10, y: 10 });
    expect(cursor.dataset.state).toBe("rest");
  });

  it("trails the mouse, turned along the way and stretched like a spring", async () => {
    mockMedia();
    const { cursor, ring } = await renderRing();
    point(window, "pointermove", { x: 100, y: 100 });
    tick?.();
    expect(gsap.getProperty(cursor, "x")).toBe(100);

    point(window, "pointermove", { x: 200, y: 100 });
    tick?.();
    // A fifth of the way (cursor-ring-motion.ts), still 80 px behind:
    // pointing right and 40 px longer.
    expect(gsap.getProperty(cursor, "x")).toBeCloseTo(120);
    expect(gsap.getProperty(cursor, "y")).toBeCloseTo(100);
    expect(gsap.getProperty(cursor, "rotation")).toBeCloseTo(90);
    expect(ring.style.getPropertyValue("--ks-cursor-stretch")).toBe("40px");
  });

  it("rests once it has caught up, until the mouse moves again", async () => {
    mockMedia();
    const { cursor, ring } = await renderRing();
    point(window, "pointermove", { x: 100, y: 100 });
    tick?.();
    ring.style.setProperty("--ks-cursor-stretch", "untouched");
    tick?.();
    expect(ring.style.getPropertyValue("--ks-cursor-stretch")).toBe(
      "untouched",
    );
    point(window, "pointermove", { x: 200, y: 100 });
    tick?.();
    expect(gsap.getProperty(cursor, "x")).toBeCloseTo(120);
    expect(ring.style.getPropertyValue("--ks-cursor-stretch")).toBe("40px");
  });

  it("steps aside over links and buttons, unstretched", async () => {
    mockMedia();
    const { container, cursor, ring } = await renderRing(
      <a href="/oferta">
        <span>Oferta</span>
      </a>,
    );
    point(window, "pointermove", { x: 0, y: 0 });
    point(container.querySelector("span")!, "pointermove", { x: 200, y: 0 });
    expect(cursor.dataset.state).toBe("link");
    tick?.();
    expect(gsap.getProperty(cursor, "rotation")).toBe(0);
    expect(ring.style.getPropertyValue("--ks-cursor-stretch")).toBe("0px");
  });

  it("says Zobacz over offer tiles and specialist cards", async () => {
    mockMedia();
    const { container, cursor, label } = await renderRing(
      <div className="ks-sp">
        <a href="/specjalisci/anna">Anna</a>
      </div>,
    );
    point(container.querySelector("a")!, "pointermove");
    expect(cursor.dataset.state).toBe("view");
    expect(label).toHaveTextContent("Zobacz");
  });

  it("takes its word from data-cursor-label", async () => {
    mockMedia();
    const { container, cursor, label } = await renderRing(
      <div data-cursor-label="Przeciągnij">galeria</div>,
    );
    point(container.querySelector("[data-cursor-label]")!, "pointermove");
    expect(cursor.dataset.state).toBe("view");
    expect(label).toHaveTextContent("Przeciągnij");
    // The disc grows to fit a longer word (public-site.css).
    expect(
      container
        .querySelector<HTMLElement>(".ks-cursor__ring")!
        .style.getPropertyValue("--ks-cursor-chars"),
    ).toBe("11");
  });

  it("goes away when the mouse leaves the page", async () => {
    mockMedia();
    const { cursor } = await renderRing();
    point(window, "pointermove");
    point(document.documentElement, "pointerleave");
    expect(cursor.dataset.state).toBe("away");
  });

  it("stops following once unmounted", async () => {
    mockMedia();
    const { unmount, cursor } = await renderRing();
    unmount();
    expect(gsap.ticker.remove).toHaveBeenCalledWith(tick);
    point(window, "pointermove");
    expect(cursor.dataset.state).toBe("away");
  });
});
