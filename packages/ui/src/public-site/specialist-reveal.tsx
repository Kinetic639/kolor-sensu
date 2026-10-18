"use client";

// Client-side half of SpecialistWatercolorCard's entrance animation. It
// renders the same root element the static card uses, around the same
// server-rendered layers, and only adds behaviour once hydrated:
//
//   (no attribute)  server HTML. Without a script, or where motion is
//                   reduced, the finished card shows. With a script,
//                   public-site.css keeps the portrait, splash and plate
//                   hidden until it runs (and shows them after 3 s anyway).
//   waiting         mounted; waits until the card is in view and loaded.
//   playing         portrait lifts in, the splash blooms outward from
//                   behind the torso (specialist-splash-matte.ts), the plate
//                   arrives last. Where SVG masks don't work (WebKit) the
//                   splash fades instead of blooming.
//   fading          reduced motion, "simple-fade": a short fade instead.
//   done            no matte, no inline styles: exactly the static card.

import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  type GsapAnimation,
  type GsapTimeline,
  useLazyGsap,
} from "./lazy-gsap";
import {
  decoded,
  matches,
  preload,
  shownByFallback,
  svgMasksSupported,
  watchReveal,
} from "./reveal-support";
import {
  createSplashMatte,
  createSplashTimeline,
  type SplashMatte,
  type SplashMatteVariant,
  splashMatteUrls,
} from "./specialist-splash-matte";
import type { ReducedMotionMode } from "./watercolor-reveal";

/**
 * Inspection hooks for Storybook (slow motion, matte debug, frame strips).
 * Not for product pages.
 */
export interface SpecialistRevealDebug {
  /** Show the reveal frozen at this time (s) instead of playing it. */
  freezeAt?: number;
  /** Keep the matte in the page after the reveal, to inspect it. */
  keepMatte?: boolean;
  /** Receives the matte (if any) and the timeline once the reveal starts. */
  onReveal?: (reveal: { matte?: SplashMatte; timeline: GsapTimeline }) => void;
}

export const SpecialistRevealDebugContext =
  createContext<SpecialistRevealDebug | null>(null);

export interface SpecialistRevealProps {
  as: "article" | "div" | "li";
  matte: SplashMatteVariant;
  reducedMotionMode: ReducedMotionMode;
  /** Extra wait (s) before this card starts, to stagger a row of cards. */
  delay: number;
  /**
   * How much of the card has to be on screen before it plays (0 to 1);
   * less where the screen is too short to show that much of it.
   */
  threshold?: number;
  className?: string;
  children: ReactNode;
}

/** Whether it shows as it is, with no reveal. */
function staysStill(root: HTMLElement, reducedMotionMode: ReducedMotionMode) {
  return (
    // Already shown by the no-script fallback (the script came late).
    shownByFallback(root, "--ks-sp-hidden", "1") ||
    !matches("(scripting: enabled)") ||
    (matches("(prefers-reduced-motion: reduce)") &&
      reducedMotionMode === "static")
  );
}

// Longest wait for the images before revealing anyway.
const LOAD_TIMEOUT = 1500;

const layers = {
  portrait: ".ks-sp__portrait",
  splash: ".ks-sp__splash",
  stain: ".ks-sp__stain",
  plate: ".ks-sp__plate",
} as const;

export function SpecialistReveal({
  as: Root,
  matte: variant,
  reducedMotionMode,
  delay,
  threshold = 0.3,
  className,
  children,
}: SpecialistRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const debug = useContext(SpecialistRevealDebugContext);

  // At once, without GSAP: whether it is revealed at all, so the
  // stylesheet's fallback does not show it before its turn. GSAP comes
  // when it is near (useLazyGsap).
  useEffect(() => {
    const root = ref.current;
    if (root && !root.dataset.reveal) {
      root.dataset.reveal = staysStill(root, reducedMotionMode)
        ? "done"
        : "waiting";
    }
  }, [reducedMotionMode]);

  useLazyGsap(
    ({ gsap }, contextSafe) => {
      const root = ref.current;
      if (!root || root.dataset.reveal === "done") return;
      const setState = (state: string) => {
        root.dataset.reveal = state;
      };
      const reduce = matches("(prefers-reduced-motion: reduce)");

      const find = (selector: string) =>
        root.querySelector<HTMLElement>(selector);
      const targets = {
        portrait: find(layers.portrait),
        splash: find(layers.splash),
        stain: find(layers.stain),
        plate: find(layers.plate),
      };
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let animation: GsapAnimation | undefined;
      let matte: SplashMatte | undefined;

      const clear = () => {
        for (const target of Object.values(targets)) {
          if (!target) continue;
          gsap.set(target, { clearProps: "opacity,transform,translate" });
          target.style.removeProperty("mask-image");
          target.style.removeProperty("-webkit-mask-image");
          if (target.getAttribute("style") === "") {
            target.removeAttribute("style");
          }
        }
        root.style.removeProperty("opacity");
        if (root.getAttribute("style") === "") root.removeAttribute("style");
      };
      const finish = () => {
        animation?.kill();
        setState("done");
        clear();
        if (!debug?.keepMatte) matte?.svg.remove();
      };

      const fade = contextSafe(() => {
        setState("fading");
        animation = gsap.fromTo(
          root,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "sine.out", onComplete: finish },
        );
      });

      // Built ahead, paused at its start (the layers are hidden until then
      // anyway); the mask goes on when it plays.
      const frozen = debug?.freezeAt;
      let timeline: GsapTimeline | undefined;
      const build = contextSafe(() => {
        if (targets.splash && svgMasksSupported()) {
          matte = createSplashMatte(root, variant);
        }
        timeline = createSplashTimeline({
          gsap,
          ...targets,
          matte,
          delay: frozen === undefined ? delay : 0,
          paused: true,
          onComplete: finish,
        });
        animation = timeline;
      });

      const reveal = contextSafe(() => {
        if (!timeline) build();
        if (matte && targets.splash) {
          targets.splash.style.setProperty("mask-image", matte.url);
          targets.splash.style.setProperty("-webkit-mask-image", matte.url);
        }
        setState("playing");
        debug?.onReveal?.({ matte, timeline: timeline! });
        // restart(true) keeps the stagger delay.
        if (frozen !== undefined) timeline!.time(frozen);
        else timeline!.restart(true);
      });

      // Load and decode the images and the splash atlases, then build the
      // reveal, before it is needed.
      let prepared: Promise<void> | undefined;
      const prepare = () =>
        (prepared ??= (async () => {
          const loaded = Promise.all([
            ...Array.from(root.querySelectorAll("img"), decoded),
            ...(reduce ? [] : splashMatteUrls.map(preload)),
          ]);
          const timeout = new Promise((resolve) => {
            timer = setTimeout(resolve, LOAD_TIMEOUT);
          });
          await Promise.race([loaded, timeout]);
          clearTimeout(timer);
          if (!cancelled && !reduce) build();
        })());

      const start = async () => {
        await prepare();
        if (cancelled) return;
        if (reduce) fade();
        else reveal();
      };

      // Prepare when the card comes near, play once enough of it is on
      // screen: `threshold` of it, or as much as nine tenths of the
      // screen can show. (A frozen debug frame is drawn at once.)
      const height = root.getBoundingClientRect().height;
      const fits = height > 0 ? (window.innerHeight * 0.9) / height : threshold;
      const stop =
        frozen === undefined
          ? watchReveal(root, {
              threshold: Math.min(threshold, fits),
              near: () => void prepare(),
              visible: () => void start(),
            })
          : (void start(), () => {});

      return () => {
        cancelled = true;
        clearTimeout(timer);
        stop();
        clear();
        matte?.svg.remove();
      };
    },
    {
      scope: ref,
      onUnavailable: () => {
        if (ref.current) ref.current.dataset.reveal = "done";
      },
    },
  );

  return (
    <Root
      ref={ref as RefObject<HTMLDivElement & HTMLLIElement>}
      className={className}
      data-animation="splash-reveal"
      data-reduced-motion={reducedMotionMode}
    >
      {children}
    </Root>
  );
}
