"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/utils";

export interface PaintRevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * "in-view" (default) paints when the block scrolls into view. Blocks that
   * are already on screen when the page loads stay as they are, so content the
   * reader can see is never hidden. "mount" paints right after hydration
   * (demos; for a hero prefer WatercolorImage paint="on-load", which needs no
   * JavaScript at all).
   */
  trigger?: "in-view" | "mount";
  /** Share of the block that must be visible before it paints. */
  threshold?: number;
}

/**
 * Plays the paint-reveal sequence of every WatercolorImage inside it.
 *
 * The only client code in the painted layer. It never renders different HTML
 * on the server and the client: it sets `data-paint` on its own element after
 * hydration ("idle" → "play" → "done"), and the CSS in public-site.css does
 * the rest. With prefers-reduced-motion, or without JavaScript, nothing is
 * hidden and nothing moves.
 */
export function PaintReveal({
  children,
  trigger = "in-view",
  threshold = 0.2,
  className,
  ...props
}: PaintRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let cancelled = false;

    const finish = () => {
      const running = node.getAnimations?.({ subtree: true }) ?? [];
      Promise.all(running.map((animation) => animation.finished))
        .then(() => {
          if (!cancelled) node.dataset.paint = "done";
        })
        .catch(() => {
          // A cancelled animation (unmount, style change) needs no cleanup.
        });
    };

    const play = () => {
      node.dataset.paint = "play";
      frame = requestAnimationFrame(finish);
    };

    if (trigger === "mount") {
      node.dataset.paint = "idle";
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(play);
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
      };
    }

    if (typeof IntersectionObserver === "undefined") return;

    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;

    node.dataset.paint = "idle";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          play();
        }
      },
      { threshold },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [trigger, threshold]);

  return (
    <div ref={ref} className={cn("ks-paint-reveal", className)} {...props}>
      {children}
    </div>
  );
}
