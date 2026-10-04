"use client";

import { useEffect, useState } from "react";

// A part that opens and closes in place, with its height eased: opening,
// it is shown first and grows from a frame drawn closed; closing, it
// shrinks and is hidden (from screen readers and the keyboard too) only
// once it has. With reduced motion it simply appears and goes.

/** How long the height eases, in ms (the same as `duration-200`). */
export const EXPAND_MS = 200;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useExpand(open: boolean) {
  // Rendered open from the server: no motion on the first paint.
  const [shown, setShown] = useState(open);
  const [expanded, setExpanded] = useState(open);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      return;
    }
    setShown(true);
    // One frame drawn closed (shown, no height), then it grows from it.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setExpanded(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Hidden only once the shrinking, drawn from now on, has ended.
  useEffect(() => {
    if (open || expanded || !shown) return;
    const timer = setTimeout(
      () => setShown(false),
      reducedMotion() ? 0 : EXPAND_MS,
    );
    return () => clearTimeout(timer);
  }, [open, expanded, shown]);

  return { shown, expanded };
}
