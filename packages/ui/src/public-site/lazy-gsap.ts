import type { gsap } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import { type RefObject, useEffect, useRef } from "react";

// GSAP, fetched only when an animation is about to be needed, so it is not
// part of the page's first load (it is the largest script the public site
// has, and a phone would otherwise download and run it before the first
// screen is ready). useLazyGsap stands in for @gsap/react's useGSAP: the
// same setup, run inside a gsap.context scoped to the element and reverted
// on unmount, but only once
//
//   near     the element is about a screen away (the default), or
//   pointer  the visitor first moves a mouse (the cursor ring: never on a
//            touch screen), or
//   now      at once, after mounting.
//
// Until then nothing animates and the markup shows as the server sent it.

export type GsapInstance = typeof gsap;
export type GsapTimeline = GSAPTimeline;
export type GsapAnimation = GSAPAnimation;

export interface GsapKit {
  gsap: GsapInstance;
  ScrollTrigger: typeof ScrollTriggerType;
}

let kit: Promise<GsapKit> | null = null;

/** GSAP and ScrollTrigger, fetched once and shared. */
export function loadGsap(): Promise<GsapKit> {
  kit ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    // Not registered here: ScrollTrigger reaches for matchMedia once
    // registered, so each animation registers it after its own checks.
    ([{ gsap }, { ScrollTrigger }]) => ({ gsap, ScrollTrigger }),
    (error: unknown) => {
      kit = null; // try again next time
      throw error;
    },
  );
  return kit;
}

type ContextSafe = <Fn extends (...args: never[]) => unknown>(fn: Fn) => Fn;

export interface LazyGsapOptions {
  /** The element the animation belongs to (and is watched, for "near"). */
  scope?: RefObject<Element | null>;
  start?: "near" | "pointer" | "now";
  /** When GSAP cannot be fetched (offline): settle on the still picture. */
  onUnavailable?: () => void;
}

/** When `start` has come; returns a function that stops waiting. */
function whenStarting(
  element: Element | null,
  start: NonNullable<LazyGsapOptions["start"]>,
  go: () => void,
) {
  if (start === "pointer") {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      window.removeEventListener("pointermove", onMove);
      go();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }
  if (
    start === "now" ||
    !element ||
    typeof IntersectionObserver !== "function"
  ) {
    go();
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        go();
      }
    },
    { rootMargin: "100% 0px 100% 0px" },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * As useGSAP (no dependencies): `setup` runs once, inside a gsap.context
 * scoped to `scope`; a function it returns runs when the context reverts
 * (on unmount); `contextSafe` wraps handlers made inside it.
 */
export function useLazyGsap(
  setup: (kit: GsapKit, contextSafe: ContextSafe) => void | (() => void),
  { scope, start = "near", onUnavailable }: LazyGsapOptions = {},
) {
  const latest = useRef(setup);
  latest.current = setup;
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;

  useEffect(() => {
    let stopped = false;
    let revert: (() => void) | undefined;
    const stopWaiting = whenStarting(scope?.current ?? null, start, () => {
      loadGsap().then(
        (loaded) => {
          if (stopped) return;
          const context = loaded.gsap.context(
            () => {},
            scope?.current ?? undefined,
          );
          const contextSafe: ContextSafe = (fn) =>
            context.add(null as never, fn as never) as never;
          context.add(() => latest.current(loaded, contextSafe));
          revert = () => context.revert();
        },
        () => {
          if (!stopped) unavailable.current?.();
        },
      );
    });
    return () => {
      stopped = true;
      stopWaiting();
      revert?.();
    };
  }, [scope, start]);
}
