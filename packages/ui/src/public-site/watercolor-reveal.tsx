"use client";

// Client-side half of WatercolorImage's entrance animation. It renders the
// same root element the static composition uses, around the same
// server-rendered layers, and only adds behaviour once hydrated:
//
//   (no attribute)  server HTML. Without a script, or where the browser
//                   cannot pre-hide, the finished composition shows. With a
//                   script, public-site.css hides the layers until it runs
//                   (and shows them anyway after 3 s, should it never run).
//   waiting         mounted; waits until the image is in view and loaded.
//   playing         the GSAP timeline paints the layers in.
//   fading          reduced motion, "simple-fade": a short fade instead.
//   done            the reveal styles no longer apply: this is exactly the
//                   static composition.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useRef,
} from "react";
import {
  clearRevealProperties,
  createWatercolorFadeTimeline,
  createWatercolorRevealTimeline,
  revealMaskUrls,
  revealProperties,
} from "./watercolor-reveal-timeline";

gsap.registerPlugin(useGSAP);

export type ReducedMotionMode = "static" | "simple-fade";

export interface WatercolorRevealProps {
  as: "div" | "figure";
  reducedMotionMode: ReducedMotionMode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Longest wait for the images before painting anyway.
const LOAD_TIMEOUT = 1500;

function matches(query: string) {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

function decoded(image: HTMLImageElement) {
  return typeof image.decode === "function"
    ? image.decode().catch(() => undefined)
    : undefined;
}

function preload(url: string) {
  const image = new Image();
  image.src = url;
  return decoded(image);
}

export function WatercolorReveal({
  as: Root,
  reducedMotionMode,
  className,
  style,
  children,
}: WatercolorRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const root = ref.current;
      if (!root) return;
      const setState = (state: string) => {
        root.dataset.reveal = state;
      };

      const reduce = matches("(prefers-reduced-motion: reduce)");
      // Already shown by the no-script fallback (the script came late).
      const shown =
        getComputedStyle(root)
          .getPropertyValue(revealProperties.photoX)
          .trim() === "1";
      if (
        shown ||
        !matches("(scripting: enabled)") ||
        (reduce && reducedMotionMode === "static")
      ) {
        setState("done");
        return;
      }
      setState("waiting");

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let timeline: gsap.core.Timeline | undefined;
      const finish = () => {
        timeline?.kill();
        setState("done");
        clearRevealProperties(root);
      };
      const play = contextSafe!(() => {
        if (cancelled) return;
        setState(reduce ? "fading" : "playing");
        timeline = (
          reduce ? createWatercolorFadeTimeline : createWatercolorRevealTimeline
        )(root, { onComplete: finish });
      });
      const start = async () => {
        const loaded = Promise.all([
          ...Array.from(root.querySelectorAll("img"), decoded),
          ...(reduce ? [] : revealMaskUrls.map(preload)),
        ]);
        const timeout = new Promise((resolve) => {
          timer = setTimeout(resolve, LOAD_TIMEOUT);
        });
        await Promise.race([loaded, timeout]);
        clearTimeout(timer);
        play();
      };

      // Play once, when a good part of the image is on screen.
      let observer: IntersectionObserver | undefined;
      if (typeof IntersectionObserver === "function") {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              void start();
            }
          },
          { threshold: 0.25 },
        );
        observer.observe(root);
      } else {
        void start();
      }

      return () => {
        cancelled = true;
        clearTimeout(timer);
        observer?.disconnect();
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
