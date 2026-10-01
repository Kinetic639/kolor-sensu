"use client";

// Two lines of large outlined display type that slide apart, in opposite
// directions, as the band crosses the screen (after Talking Walls'
// "Expressing yourself without words"; pure CSS, public-site.css, "Drifting
// words"). Over the outline lies the same text in watercolour, seen only
// through a patch of paint: once, as the band comes into view, the patch
// is drawn across the words like a brush, and afterwards it follows the
// pointer a little lazily, so the words fill with colour wherever it goes.
//
// Decorative: the words repeat a line said elsewhere, so the band is hidden
// from assistive technology. Under reduced motion it stays outlined.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";
import { cn } from "../lib/utils";
import { matches, watchReveal } from "./reveal-support";

gsap.registerPlugin(useGSAP);

export interface DriftingWordsProps {
  lines: readonly [string, string];
  className?: string;
}

// How fast the paint catches up with the pointer, per frame at 60 fps.
const FOLLOW = 0.075;

export function DriftingWords({ lines, className }: DriftingWordsProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const root = ref.current;
      if (
        !root ||
        !matches("(scripting: enabled)") ||
        matches("(prefers-reduced-motion: reduce)")
      ) {
        return;
      }
      const fills = Array.from(
        root.querySelectorAll<HTMLElement>(".ks-drift-words__fill"),
      );
      // The paint's centre in page coordinates (relative to the band).
      const target = { x: -400, y: 0 };
      const paint = { x: -400, y: 0 };
      let pointer = false;
      let running = false;

      const tick = () => {
        paint.x += (target.x - paint.x) * FOLLOW * gsap.ticker.deltaRatio();
        paint.y += (target.y - paint.y) * FOLLOW * gsap.ticker.deltaRatio();
        const band = root.getBoundingClientRect();
        const boxes = fills.map((fill) => fill.getBoundingClientRect());
        fills.forEach((fill, index) => {
          const box = boxes[index]!;
          fill.style.setProperty(
            "--ks-paint-x",
            `${(band.left + paint.x - box.left).toFixed(1)}px`,
          );
          fill.style.setProperty(
            "--ks-paint-y",
            `${(band.top + paint.y - box.top).toFixed(1)}px`,
          );
        });
      };
      const run = (on: boolean) => {
        if (on === running) return;
        running = on;
        if (on) gsap.ticker.add(tick);
        else gsap.ticker.remove(tick);
      };

      const move = (event: PointerEvent) => {
        const band = root.getBoundingClientRect();
        target.x = event.clientX - band.left;
        target.y = event.clientY - band.top;
        if (!pointer) {
          pointer = true;
          sweep?.kill();
        }
      };
      const leave = () => {
        pointer = false;
      };

      // On screen only: no work while the band is out of view.
      const visibility = new IntersectionObserver(([entry]) =>
        run(Boolean(entry?.isIntersecting)),
      );
      visibility.observe(root);

      // The first pass: one stroke across both lines, left to right.
      let sweep: gsap.core.Tween | undefined;
      const stopWatch = watchReveal(root, {
        threshold: 0.5,
        near: () => undefined,
        visible: contextSafe!(() => {
          if (pointer) return;
          const width = root.clientWidth;
          const height = root.clientHeight;
          target.y = paint.y = height / 2;
          paint.x = target.x = -0.15 * width;
          sweep = gsap.to(target, {
            x: width * 1.2,
            duration: 2.4,
            ease: "power1.inOut",
          });
        }),
      });

      root.addEventListener("pointermove", move);
      root.addEventListener("pointerleave", leave);
      return () => {
        run(false);
        visibility.disconnect();
        stopWatch();
        root.removeEventListener("pointermove", move);
        root.removeEventListener("pointerleave", leave);
      };
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className={cn("ks-drift-words", className)}
      aria-hidden="true"
    >
      {lines.map((line) => (
        <span key={line} className="ks-drift-words__line">
          <span className="ks-drift-words__text">{line}</span>
          <span className="ks-drift-words__fill">{line}</span>
        </span>
      ))}
    </div>
  );
}
