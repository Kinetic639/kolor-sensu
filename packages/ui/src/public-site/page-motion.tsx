"use client";

// The homepage's quiet choreography around the pictures (which reveal
// themselves: WatercolorReveal, OfferReveal, SpecialistReveal). Wrap a page
// in <PageMotion> and mark what should move:
//
//   [data-motion="text"]   a section's text column. As it comes into view
//                          its children rise into place one after another;
//                          a heading comes in line by line from behind its
//                          own baseline (SplitText line masks), as if the
//                          words were set down with the paint beside them.
//   [data-motion="band"]   a WatercolorSectionBackground. Its paint is
//                          dragged in from the left by its own brushed edge
//                          (the band's mask, intersected with a copy of
//                          itself sliding into place), then the ink sprig
//                          settles with one small sway.
//   data-motion-delay      extra wait (s) before an element starts.
//
// Pictures inside a PageMotion also get a few percent of scroll parallax
// inside their painted frame; that part is pure CSS (public-site.css,
// "Page motion"), as is the hidden starting state, which applies only where
// scripting is on and motion is welcome, and lifts itself after 3 s if this
// script never runs. Every element ends exactly as the static page draws
// it: the split is reverted and the inline styles cleared.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { type ReactNode, useRef } from "react";
import { cn } from "../lib/utils";
import { matches, shownByFallback, watchReveal } from "./reveal-support";

gsap.registerPlugin(useGSAP, SplitText);

const EASE = "power3.out";

function delayOf(element: HTMLElement) {
  return Number(element.dataset.motionDelay ?? 0) || 0;
}

function playText(root: HTMLElement) {
  const items = Array.from(root.children) as HTMLElement[];
  const timeline = gsap.timeline({ delay: delayOf(root) });
  let split: SplitText | undefined;

  items.forEach((item, index) => {
    const at = index * 0.09;
    if (/^H[1-4]$/.test(item.tagName)) {
      split = SplitText.create(item, { type: "lines", mask: "lines" });
      timeline.set(item, { opacity: 1 }, 0);
      timeline.from(
        split.lines,
        { yPercent: 105, duration: 0.9, ease: EASE, stagger: 0.1 },
        at,
      );
    } else {
      timeline.fromTo(
        item,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, ease: EASE },
        at + 0.05,
      );
    }
  });

  timeline.eventCallback("onComplete", () => {
    split?.revert();
    gsap.set(items, { clearProps: "opacity,transform,translate" });
    root.dataset.motionState = "done";
  });
  return timeline;
}

function playBand(root: HTMLElement) {
  const sprig = root.querySelector<SVGElement>(".ks-sprig");
  const timeline = gsap.timeline({ delay: delayOf(root) });
  timeline.fromTo(
    root,
    { "--ks-band-x": "-101%" },
    { "--ks-band-x": "0%", duration: 1.5, ease: "power2.inOut" },
  );
  if (sprig) {
    timeline.fromTo(
      sprig,
      { opacity: 0, rotation: -6, transformOrigin: "50% 100%" },
      { opacity: 1, rotation: 0, duration: 1.4, ease: "elastic.out(1, 0.6)" },
      0.9,
    );
  }
  timeline.eventCallback("onComplete", () => {
    gsap.set(root, { clearProps: "--ks-band-x" });
    if (sprig) gsap.set(sprig, { clearProps: "opacity,transform" });
    root.dataset.motionState = "done";
  });
  return timeline;
}

export function PageMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const targets = Array.from(
        root.querySelectorAll<HTMLElement>("[data-motion]"),
      );
      const still =
        !matches("(scripting: enabled)") ||
        matches("(prefers-reduced-motion: reduce)");

      const stops = targets.map((target) => {
        const kind = target.dataset.motion;
        // Already shown by the stylesheet's safety net, or no motion wanted:
        // leave the finished state alone.
        if (
          still ||
          shownByFallback(
            target,
            kind === "band" ? "--ks-band-x" : "--ks-motion-hidden",
            kind === "band" ? "0%" : "1",
          )
        ) {
          target.dataset.motionState = "done";
          return () => undefined;
        }
        target.dataset.motionState = "waiting";
        return watchReveal(target, {
          threshold: kind === "band" ? 0.35 : 0.25,
          near: () => undefined,
          visible: () => {
            target.dataset.motionState = "playing";
            if (kind === "band") playBand(target);
            else playText(target);
          },
        });
      });

      return () => stops.forEach((stop) => stop());
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("ks-motion", className)}>
      {children}
    </div>
  );
}
