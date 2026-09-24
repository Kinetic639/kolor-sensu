import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaintReveal } from "./paint-reveal";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let observerCallback: ObserverCallback | undefined;
let reduceMotion = false;

function mockEnvironment() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduceMotion && query.includes("reduce"),
      media: query,
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: ObserverCallback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
}

function placeBlock(top: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top + 400,
  } as DOMRect);
}

function renderReveal(trigger?: "in-view" | "mount") {
  const { container } = render(
    <PaintReveal trigger={trigger}>
      <p>Obraz</p>
    </PaintReveal>,
  );
  return container.firstElementChild as HTMLElement;
}

describe("PaintReveal", () => {
  beforeEach(() => {
    reduceMotion = false;
    observerCallback = undefined;
    mockEnvironment();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("holds a below-the-fold block and paints it when it scrolls in", () => {
    placeBlock(window.innerHeight + 200);
    const block = renderReveal();

    expect(block).toHaveAttribute("data-paint", "idle");

    act(() => observerCallback?.([{ isIntersecting: true }]));
    expect(block).toHaveAttribute("data-paint", "play");
  });

  it("never hides a block that is already on screen", () => {
    placeBlock(100);
    const block = renderReveal();

    expect(block).not.toHaveAttribute("data-paint");
  });

  it("does nothing with reduced motion", () => {
    reduceMotion = true;
    placeBlock(window.innerHeight + 200);
    const block = renderReveal();

    expect(block).not.toHaveAttribute("data-paint");
    expect(observerCallback).toBeUndefined();
  });

  it("paints right after mount when asked", () => {
    placeBlock(100);
    const block = renderReveal("mount");

    expect(block).toHaveAttribute("data-paint", "play");
  });

  it("always renders its children", () => {
    placeBlock(window.innerHeight + 200);
    const block = renderReveal();

    expect(block).toHaveTextContent("Obraz");
  });
});
