import { act, render, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLazyGsap } from "./lazy-gsap";

// GSAP arrives only when an animation is about to be needed: near the
// screen, on a first mouse move, or at once.

const observers: Array<{
  callback: IntersectionObserverCallback;
  target?: Element;
}> = [];
class Observer {
  target?: Element;
  constructor(public callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }) as unknown as MediaQueryList,
  );
});

afterEach(() => {
  observers.length = 0;
  vi.unstubAllGlobals();
});

function Animated({
  start,
  setup,
}: {
  start?: "near" | "pointer" | "now";
  setup: () => void | (() => void);
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLazyGsap(setup, { scope: ref, start });
  return <div ref={ref} />;
}

describe("useLazyGsap", () => {
  it("waits until the element nears the screen", async () => {
    vi.stubGlobal("IntersectionObserver", Observer);
    const setup = vi.fn();
    render(<Animated setup={setup} />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(setup).not.toHaveBeenCalled();

    const [observer] = observers;
    act(() =>
      observer!.callback(
        [
          {
            isIntersecting: true,
            target: observer!.target,
          } as IntersectionObserverEntry,
        ],
        observer as unknown as IntersectionObserver,
      ),
    );
    await waitFor(() => expect(setup).toHaveBeenCalledTimes(1));
    expect(setup.mock.calls[0]![0]).toHaveProperty("gsap.timeline");
  });

  it("starts the cursor's animation on a mouse's first move, not a finger's", async () => {
    const setup = vi.fn();
    render(<Animated setup={setup} start="pointer" />);
    window.dispatchEvent(
      Object.assign(new Event("pointermove"), { pointerType: "touch" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(setup).not.toHaveBeenCalled();

    window.dispatchEvent(
      Object.assign(new Event("pointermove"), { pointerType: "mouse" }),
    );
    await waitFor(() => expect(setup).toHaveBeenCalledTimes(1));
  });

  it("starts at once when asked, and cleans up on unmount", async () => {
    const cleanup = vi.fn();
    const { unmount } = render(<Animated setup={() => cleanup} start="now" />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
