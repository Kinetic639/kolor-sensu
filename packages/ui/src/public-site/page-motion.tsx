"use client";

// The homepage's choreography around the pictures (which reveal themselves:
// WatercolorReveal, OfferReveal, SpecialistReveal). Wrap a page in
// <PageMotion> and mark what should move:
//
//   [data-motion="text"]   a section's text column. As it comes into view
//                          its heading rises word by word, each word lifted
//                          from just below its place with a soft overshoot
//                          (after Talking Walls), and the rest of the
//                          column follows with a short fade.
//   [data-motion="band"]   a WatercolorSectionBackground. Its paint is
//                          uncovered by a circle swept in from the lower
//                          left corner, like one long stroke of the brush,
//                          then the ink sprig settles with one small sway.
//   data-motion-delay      extra wait (s) before an element starts.
//
// Pictures move a little faster than the text beside them as the page
// scrolls (scrubbed with the scroll, so they keep pace with it): the
// section pictures, the offer tiles and the specialists' portraits, each
// row at two speeds so neighbours drift apart. The page also scrolls with a
// little inertia (Lenis, on a mouse wheel or trackpad only; touch keeps the
// native scroll). All of it stays off under prefers-reduced-motion.
//
// The hidden starting state is CSS (public-site.css, "Page motion"), which
// applies only where scripting is on and motion is welcome, and lifts
// itself after 3 s if this script never runs. Every element ends exactly as
// the static page draws it: the split is reverted and inline styles cleared.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { type ReactNode, useRef } from "react";
import { cn } from "../lib/utils";
import { matches, shownByFallback, watchReveal } from "./reveal-support";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const HEADING = /^H[1-4]$/;

function delayOf(element: HTMLElement) {
  return Number(element.dataset.motionDelay ?? 0) || 0;
}

/**
 * Splits a text column's headings into words and puts them in their
 * starting places, ahead of time, so nothing is measured when it plays.
 */
function prepareText(root: HTMLElement) {
  const items = Array.from(root.children) as HTMLElement[];
  const splits: SplitText[] = [];
  for (const item of items) {
    if (!HEADING.test(item.tagName)) continue;
    const split = SplitText.create(item, { type: "words" });
    gsap.set(item, { opacity: 1 });
    gsap.set(split.words, { yPercent: 60, rotate: 2.5, autoAlpha: 0 });
    splits.push(split);
  }
  return { items, splits };
}

function playText(
  root: HTMLElement,
  { items, splits }: ReturnType<typeof prepareText>,
) {
  const timeline = gsap.timeline({ delay: delayOf(root) });
  let at = 0;
  for (const split of splits) {
    timeline.to(
      split.words,
      { autoAlpha: 1, duration: 0.7, ease: "power2.out", stagger: 0.045 },
      at,
    );
    timeline.to(
      split.words,
      {
        yPercent: 0,
        rotate: 0,
        duration: 1,
        ease: "back.out(1.4)",
        stagger: 0.045,
      },
      at,
    );
    at += 0.15 + split.words.length * 0.045;
  }
  const rest = items.filter((item) => !HEADING.test(item.tagName));
  if (rest.length) {
    timeline.fromTo(
      rest,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 },
      Math.max(0, at - 0.35),
    );
  }
  timeline.eventCallback("onComplete", () => {
    splits.forEach((split) => split.revert());
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
    { "--ks-band-r": "0%" },
    { "--ks-band-r": "160%", duration: 1.6, ease: "expo.inOut" },
  );
  if (sprig) {
    timeline.fromTo(
      sprig,
      { opacity: 0, rotation: -6, transformOrigin: "50% 100%" },
      { opacity: 1, rotation: 0, duration: 1.4, ease: "elastic.out(1, 0.6)" },
      1.1,
    );
  }
  timeline.eventCallback("onComplete", () => {
    gsap.set(root, { clearProps: "--ks-band-r" });
    if (sprig) gsap.set(sprig, { clearProps: "opacity,transform" });
    root.dataset.motionState = "done";
  });
  return timeline;
}

function smoothScroll() {
  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  const tick = (time: number) => lenis.raf(time * 1000);
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

/** Scrubbed drift: `amount` % of the element's height, down to up. */
function drift(element: Element, trigger: Element, amount: number) {
  gsap.fromTo(
    element,
    { yPercent: amount },
    {
      yPercent: -amount,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    },
  );
}

/**
 * Pictures a little faster than the text beside them. The first section's
 * picture only rises as the page leaves the top.
 */
function parallax(root: HTMLElement) {
  const sections = Array.from(root.querySelectorAll(":scope > section"));
  sections.forEach((section, index) => {
    if (section.matches(".ks-story")) return;
    const pictures = section.querySelectorAll(":scope > .ks-wc");
    pictures.forEach((picture) => {
      if (index === 0) {
        gsap.to(picture, {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      } else drift(picture, section, 9);
    });
    const cards = section.querySelectorAll(".ks-of, .ks-sp");
    cards.forEach((card, at) => drift(card, section, at % 2 ? 12 : 5));
  });
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
    (_, contextSafe) => {
      const root = ref.current;
      if (!root) return;
      const still =
        !matches("(scripting: enabled)") ||
        matches("(prefers-reduced-motion: reduce)");
      const targets = Array.from(
        root.querySelectorAll<HTMLElement>("[data-motion]"),
      );

      if (still) {
        targets.forEach((target) => (target.dataset.motionState = "done"));
        return;
      }

      const stopScroll = smoothScroll();
      parallax(root);

      let cancelled = false;
      const stops: Array<() => void> = [];
      const start = contextSafe!(() => {
        if (cancelled) return;
        for (const target of targets) {
          const kind = target.dataset.motion;
          // Already shown by the stylesheet's safety net: leave it.
          if (
            shownByFallback(
              target,
              kind === "band" ? "--ks-band-r" : "--ks-motion-hidden",
              kind === "band" ? "160%" : "1",
            )
          ) {
            target.dataset.motionState = "done";
            continue;
          }
          target.dataset.motionState = "waiting";
          const prepared = kind === "text" ? prepareText(target) : null;
          stops.push(
            watchReveal(target, {
              threshold: kind === "band" ? 0.35 : 0.2,
              near: () => undefined,
              visible: contextSafe!(() => {
                target.dataset.motionState = "playing";
                if (prepared) playText(target, prepared);
                else playBand(target);
              }),
            }),
          );
        }
        ScrollTrigger.refresh();
      });
      // Words are measured in their real face.
      void document.fonts.ready.then(start);

      return () => {
        cancelled = true;
        stops.forEach((stop) => stop());
        stopScroll();
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("ks-motion", className)}>
      {children}
    </div>
  );
}
