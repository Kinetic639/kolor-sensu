"use client";

// Marks the sticky site header with how the page is being read, for
// public-site.css ("Site header"): data-scrolled once the page has moved
// (its hairline appears), data-hidden while reading downwards past the first
// screen (it slides away), cleared on the first scroll up. Under
// prefers-reduced-motion the header never hides. Renders nothing.

import { useEffect, useRef } from "react";
import { matches } from "./reveal-support";

// Movement (px) in one direction before the header reacts, so a trackpad's
// jitter never makes it flicker.
const SLACK = 8;

export function HeaderScroll() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const header = ref.current?.closest<HTMLElement>(".ks-site-header");
    if (!header) return;
    const still = matches("(prefers-reduced-motion: reduce)");
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      header.dataset.scrolled = String(y > 4);
      if (still) return;
      const delta = y - last;
      if (Math.abs(delta) < SLACK) return;
      header.dataset.hidden = String(delta > 0 && y > header.offsetHeight * 4);
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <span ref={ref} hidden />;
}
