"use client";

// Client-side half of WatercolorImage's entrance animation. It renders the
// same root element the static composition uses, around the same
// server-rendered layers, and only adds behaviour once hydrated:
//
//   (no attribute)  server HTML. Without a script, or where the browser
//                   cannot pre-hide, the finished composition shows. With a
//                   script, public-site.css keeps the layers unpainted until
//                   it runs (and shows them anyway after 3 s, should it
//                   never run).
//   waiting         mounted; waits until the image is in view and loaded.
//   playing         the paint matte (watercolor-paint-matte.ts) masks the
//                   backdrop and the photo, and GSAP paints it stroke by
//                   stroke.
//   fading          reduced motion, "simple-fade": a short fade instead.
//   done            the matte is removed and the reveal styles no longer
//                   apply: this is exactly the static composition, and
//                   nothing keeps running.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react";
import {
  createPaintMatte,
  createPaintTimeline,
  type PaintMatte,
  paintMatteUrls,
} from "./watercolor-paint-matte";
import {
  decoded,
  matches,
  preload,
  shownByFallback,
  svgMasksSupported,
  watchReveal,
} from "./reveal-support";

gsap.registerPlugin(useGSAP);

export type ReducedMotionMode = "static" | "simple-fade";

/** Custom properties the reveal sets on the root while it runs. */
export const revealProperties = {
  backdrop: "--ks-reveal-backdrop",
  photo: "--ks-reveal-photo",
  fade: "--ks-reveal-fade",
  hidden: "--ks-reveal-hidden",
} as const;

/**
 * Inspection hooks for Storybook (slow motion, matte debug, frame strips).
 * Not for product pages.
 */
export interface WatercolorRevealDebug {
  /** Show the reveal frozen at this time (s) instead of playing it. */
  freezeAt?: number;
  /** Keep the matte in the page after the reveal, to inspect it. */
  keepMatte?: boolean;
  /** Receives the matte and the timeline once the reveal starts. */
  onReveal?: (reveal: {
    matte: PaintMatte;
    timeline: gsap.core.Timeline;
  }) => void;
}

export const WatercolorRevealDebugContext =
  createContext<WatercolorRevealDebug | null>(null);

export interface WatercolorRevealProps {
  as: "div" | "figure";
  reducedMotionMode: ReducedMotionMode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Longest wait for the images before painting anyway.
const LOAD_TIMEOUT = 1500;

export function WatercolorReveal({
  as: Root,
  reducedMotionMode,
  className,
  style,
  children,
}: WatercolorRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const debug = useContext(WatercolorRevealDebugContext);

  useGSAP(
    (_, contextSafe) => {
      const root = ref.current;
      if (!root) return;
      const setState = (state: string) => {
        root.dataset.reveal = state;
      };

      const reduce = matches("(prefers-reduced-motion: reduce)");
      // Already shown by the no-script fallback (the script came late).
      const shown = shownByFallback(root, revealProperties.hidden, "none");
      if (
        shown ||
        !matches("(scripting: enabled)") ||
        (reduce && reducedMotionMode === "static") ||
        (!reduce && !svgMasksSupported())
      ) {
        setState("done");
        return;
      }
      setState("waiting");

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let animation: gsap.core.Animation | undefined;
      let matte: PaintMatte | undefined;
      // The caption, or the decorative mark in its place: shown late.
      const caption = root.querySelector<HTMLElement>(
        ".ks-wc__caption, .ks-wc__mark",
      );

      // Back to the server markup: no reveal values, and no empty style
      // attributes left where the reveal was the only one to set a style.
      const clear = () => {
        for (const property of Object.values(revealProperties)) {
          if (property !== revealProperties.hidden) {
            root.style.removeProperty(property);
          }
        }
        caption?.style.removeProperty("opacity");
        for (const element of [root, caption]) {
          if (element?.getAttribute("style") === "") {
            element.removeAttribute("style");
          }
        }
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
          { [revealProperties.fade]: 0 },
          {
            [revealProperties.fade]: 1,
            duration: 0.4,
            ease: "sine.out",
            onComplete: finish,
          },
        );
      });

      // Built ahead, paused at its start: the masks are only applied once
      // it plays, so until then the layers stay unpainted.
      let timeline: gsap.core.Timeline | undefined;
      const build = contextSafe!(() => {
        matte = createPaintMatte(root);
        timeline = createPaintTimeline(matte, {
          caption,
          paused: true,
          onComplete: finish,
        });
        animation = timeline;
      });

      const paint = contextSafe!(() => {
        if (!matte || !timeline) build();
        root.style.setProperty(revealProperties.backdrop, matte!.backdrop.url);
        root.style.setProperty(revealProperties.photo, matte!.photo.url);
        setState("playing");
        debug?.onReveal?.({ matte: matte!, timeline: timeline! });
        const frozen = debug?.freezeAt;
        if (frozen !== undefined) timeline!.time(frozen);
        else timeline!.play();
      });

      // Load and decode the images and the stroke atlases, then build the
      // reveal, before it is needed.
      let prepared: Promise<void> | undefined;
      const prepare = () =>
        (prepared ??= (async () => {
          const loaded = Promise.all([
            ...Array.from(root.querySelectorAll("img"), decoded),
            ...(reduce ? [] : paintMatteUrls.map(preload)),
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
        else paint();
      };

      // Prepare when the image comes near, play once a good part of it is
      // on screen. (A frozen debug frame is drawn at once.)
      const stop =
        debug?.freezeAt === undefined
          ? watchReveal(root, {
              threshold: 0.25,
              near: () => void prepare(),
              visible: () => void start(),
            })
          : (void start(), () => {});

      return () => {
        cancelled = true;
        clearTimeout(timer);
        stop();
        // Unmounted or re-run mid-reveal: no matte or styles left behind.
        clear();
        matte?.svg.remove();
      };
    },
    { scope: ref },
  );

  return (
    <Root
      ref={ref as RefObject<HTMLDivElement>}
      className={className}
      style={style}
      data-animation="watercolor-reveal"
      data-reduced-motion={reducedMotionMode}
    >
      {children}
    </Root>
  );
}
