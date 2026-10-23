"use client";

// WatercolorImage's optional parallax layer (`parallaxSrc`): a second
// transparent image over the backdrop (e.g. drops of paint around the
// photo) that drifts against the page as the picture travels through the
// viewport, so the backdrop gains depth. Animated on transform only, so it
// never touches the entrance animation's mask. Skipped under
// prefers-reduced-motion, and where scripting is off the server-rendered
// layer is exactly the static result.

import { type ReactNode, useRef } from "react";
import { useLazyGsap } from "./lazy-gsap";
import { matches } from "./reveal-support";

/** How far the layer drifts, in % of its height, either side of rest. */
export const PARALLAX_DRIFT = 4;

export function ParallaxLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLazyGsap(
    ({ gsap, ScrollTrigger }) => {
      const layer = ref.current;
      if (!layer) return;
      if (
        !matches("(scripting: enabled)") ||
        matches("(prefers-reduced-motion: reduce)")
      ) {
        return;
      }

      // Registered here, not at module scope (as in CaptionMotion).
      gsap.registerPlugin(ScrollTrigger);

      gsap.fromTo(
        layer,
        { yPercent: PARALLAX_DRIFT },
        {
          yPercent: -PARALLAX_DRIFT,
          ease: "none",
          scrollTrigger: {
            // The picture, not the moving layer: its own travel would
            // shift where the scroll range starts and ends.
            trigger: layer.parentElement ?? layer,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="ks-wc__parallax" aria-hidden="true">
      {children}
    </div>
  );
}
