"use client";

// The handwritten caption's own, tiny motion: independent of
// WatercolorImage's entrance animation (which only fades the caption in,
// via opacity) and of whether that animation runs at all. Two layers,
// animated on transform only, so they never touch the fade:
//
//   .ks-wc__caption        (outer, this component's root) a few pixels of
//                          scroll parallax, tied to how far the picture has
//                          travelled through the viewport.
//   .ks-wc__caption-inner  (inner span) a slow, continuous vertical drift,
//                          so the note feels alive at rest.
//
// Both are skipped under prefers-reduced-motion, and where scripting is
// off the server-rendered caption (no inline styles yet) is exactly the
// static, non-floating result.

import { type ReactNode, type RefObject, useRef } from "react";
import { useLazyGsap } from "./lazy-gsap";
import { matches } from "./reveal-support";

export function CaptionMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  useLazyGsap(
    ({ gsap, ScrollTrigger }) => {
      const root = ref.current;
      const inner = innerRef.current;
      if (!root || !inner) return;
      if (
        !matches("(scripting: enabled)") ||
        matches("(prefers-reduced-motion: reduce)")
      ) {
        return;
      }

      // Registered here, not at module scope: ScrollTrigger reaches for
      // matchMedia as soon as it's registered, and the guard above already
      // established that it exists.
      gsap.registerPlugin(ScrollTrigger);

      gsap.to(inner, {
        y: -4,
        duration: 3.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.fromTo(
        root,
        { y: -6 },
        {
          y: 6,
          ease: "none",
          scrollTrigger: {
            trigger: root,
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
    <figcaption ref={ref as RefObject<HTMLElement>} className="ks-wc__caption">
      <span ref={innerRef} className="ks-wc__caption-inner">
        {children}
      </span>
    </figcaption>
  );
}
