"use client";

// Client-side half of OfferTile's entrance animation. It renders the same
// root element the static tile uses, around the same server-rendered
// layers, and only adds behaviour once hydrated:
//
//   (no attribute)  server HTML. Without a script, or where motion is
//                   reduced, the finished tile shows. With a script,
//                   public-site.css keeps the paint, content and arrow
//                   hidden until it runs (and shows them after 3 s anyway).
//   waiting         mounted; waits until the tile is in view and loaded.
//   playing         the paint goes on in five brush strokes, band after
//                   band (top to bottom, or bottom to top for variant "b")
//                   (offer-brush-matte.ts), then the content and the arrow
//                   arrive. Where SVG masks don't work (WebKit) the paint
//                   fades in instead.
//   fading          reduced motion, "simple-fade": a short fade instead.
//   done            no matte, no inline styles: exactly the static tile.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react";
import {
  createOfferMatte,
  createOfferTimeline,
  type OfferMatte,
  type OfferMatteVariant,
  offerMatteUrls,
} from "./offer-brush-matte";
import {
  decoded,
  matches,
  preload,
  shownByFallback,
  svgMasksSupported,
  watchReveal,
} from "./reveal-support";
import type { ReducedMotionMode } from "./watercolor-reveal";

gsap.registerPlugin(useGSAP);

/**
 * Inspection hooks for Storybook (slow motion, matte debug, frame strips).
 * Not for product pages.
 */
export interface OfferRevealDebug {
  /** Show the reveal frozen at this time (s) instead of playing it. */
  freezeAt?: number;
  /** Keep the matte in the page after the reveal, to inspect it. */
  keepMatte?: boolean;
  /** Receives the matte (if any) and the timeline once the reveal starts. */
  onReveal?: (reveal: {
    matte?: OfferMatte;
    timeline: gsap.core.Timeline;
  }) => void;
}

export const OfferRevealDebugContext = createContext<OfferRevealDebug | null>(
  null,
);

export interface OfferRevealProps {
  as: "article" | "div" | "li";
  matte: OfferMatteVariant;
  reducedMotionMode: ReducedMotionMode;
  /** Extra wait (s) before this tile starts, to stagger a row of tiles. */
  delay: number;
  className?: string;
  children: ReactNode;
}

// Longest wait for the images before revealing anyway.
const LOAD_TIMEOUT = 1500;

const layers = {
  paint: ".ks-of__paint",
  content: ".ks-of__content",
  arrow: ".ks-of__arrow",
} as const;

export function OfferReveal({
  as: Root,
  matte: variant,
  reducedMotionMode,
  delay,
  className,
  children,
}: OfferRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const debug = useContext(OfferRevealDebugContext);

  useGSAP(
    (_, contextSafe) => {
      const root = ref.current;
      if (!root) return;
      const setState = (state: string) => {
        root.dataset.reveal = state;
      };

      const reduce = matches("(prefers-reduced-motion: reduce)");
      // Already shown by the no-script fallback (the script came late).
      const shown = shownByFallback(root, "--ks-of-hidden", "1");
      if (
        shown ||
        !matches("(scripting: enabled)") ||
        (reduce && reducedMotionMode === "static")
      ) {
        setState("done");
        return;
      }
      setState("waiting");

      const find = (selector: string) =>
        root.querySelector<HTMLElement>(selector);
      const targets = {
        paint: find(layers.paint),
        content: find(layers.content),
        arrow: find(layers.arrow),
      };
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let animation: gsap.core.Animation | undefined;
      let matte: OfferMatte | undefined;

      // Back to the server markup: no inline styles left behind.
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

      const fade = contextSafe!(() => {
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
      let timeline: gsap.core.Timeline | undefined;
      const build = contextSafe!(() => {
        if (targets.paint && svgMasksSupported()) {
          matte = createOfferMatte(root, variant);
        }
        timeline = createOfferTimeline({
          ...targets,
          matte,
          delay: frozen === undefined ? delay : 0,
          paused: true,
          onComplete: finish,
        });
        animation = timeline;
      });

      const reveal = contextSafe!(() => {
        if (!timeline) build();
        if (matte && targets.paint) {
          targets.paint.style.setProperty("mask-image", matte.url);
          targets.paint.style.setProperty("-webkit-mask-image", matte.url);
        }
        setState("playing");
        debug?.onReveal?.({ matte, timeline: timeline! });
        // restart(true) keeps the stagger delay.
        if (frozen !== undefined) timeline!.time(frozen);
        else timeline!.restart(true);
      });

      // Load and decode the images and the brush atlases, then build the
      // reveal, before it is needed.
      let prepared: Promise<void> | undefined;
      const prepare = () =>
        (prepared ??= (async () => {
          const loaded = Promise.all([
            ...Array.from(root.querySelectorAll("img"), decoded),
            ...(reduce ? [] : offerMatteUrls.map(preload)),
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

      // Prepare when the tile comes near, play once a good part of it is on
      // screen. (A frozen debug frame is drawn at once.)
      const stop =
        frozen === undefined
          ? watchReveal(root, {
              threshold: 0.4,
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
    { scope: ref },
  );

  return (
    <Root
      ref={ref as RefObject<HTMLDivElement & HTMLLIElement>}
      className={className}
      data-animation="brush-reveal"
      data-reduced-motion={reducedMotionMode}
    >
      {children}
    </Root>
  );
}
