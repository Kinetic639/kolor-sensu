"use client";

import { type ReactNode, useRef } from "react";
import { useLazyGsap } from "./lazy-gsap";
import { matches } from "./reveal-support";

/** Adds motion to server-rendered ink; paint and readable content stay still. */
export function InkReveal({
  children,
  className,
  as: Root = "div",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "span";
  delay?: number;
}) {
  const root = useRef<HTMLDivElement & HTMLSpanElement>(null);
  useLazyGsap(
    ({ gsap }, contextSafe) => {
      const element = root.current;
      if (!element || !matches("(scripting: enabled)")) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const strokes = [
          ...element.querySelectorAll<SVGPathElement>("[data-ink-stroke]"),
        ];
        const tips = [
          ...element.querySelectorAll<SVGPathElement>("[data-ink-tip]"),
        ];
        // Unsupported SVG APIs leave the complete server-rendered artwork.
        if (
          !strokes.length ||
          strokes.some((path) => typeof path.getTotalLength !== "function")
        )
          return;
        const lengths = strokes.map((path) => path.getTotalLength());
        if (lengths.some((length) => !Number.isFinite(length) || length <= 0))
          return;
        strokes.forEach((path, index) =>
          gsap.set(path, {
            strokeDasharray: `${lengths[index]} ${lengths[index]}`,
            strokeDashoffset: lengths[index],
          }),
        );
        if (tips.length) gsap.set(tips, { opacity: 0 });
        element.dataset.inkState = "waiting";
        let observer: IntersectionObserver | undefined;
        let activation: MutationObserver | undefined;
        let visible = false;
        let timeline: ReturnType<typeof gsap.timeline> | undefined;
        const play = contextSafe(() => {
          const picture = element.closest<HTMLElement>(
            ".ks-story__picture[data-rich]",
          );
          const story = picture?.closest<HTMLElement>(".ks-story");
          if (
            !visible ||
            (story?.hasAttribute("data-pinned") &&
              !picture?.hasAttribute("data-active"))
          )
            return;
          observer?.disconnect();
          activation?.disconnect();
          timeline = gsap.timeline({
            delay: matches("(min-width: 70rem)") ? delay : 0,
            onStart: () => {
              element.dataset.inkState = "drawing";
            },
            onComplete: () => {
              // Leave ordinary static paths, including after a CMS preview
              // changes their geometry or reorders contacts without remounting.
              strokes.forEach((path) => {
                path.style.removeProperty("stroke-dasharray");
                path.style.removeProperty("stroke-dashoffset");
              });
              tips.forEach((path) => path.style.removeProperty("opacity"));
              element.dataset.inkState = "complete";
            },
          });
          const animate = (
            selector: string,
            duration: number,
            at: number,
            ease = "power2.inOut",
          ) => {
            const paths = element.querySelectorAll(selector);
            if (paths.length)
              timeline!.to(paths, { strokeDashoffset: 0, duration, ease }, at);
          };
          animate(
            '[data-ink-stroke="frame"], [data-ink-stroke="underline"]',
            1.6,
            0.04,
          );
          animate('[data-ink-stroke="shaft"]', 1.1, 0.3);
          animate('[data-ink-stroke="head"]', 0.42, 1.15, "power2.out");
          const start = element.querySelector('[data-ink-tip="start"]');
          const end = element.querySelector('[data-ink-tip="end"]');
          if (start)
            timeline.to(
              start,
              { opacity: 1, duration: 0.12, ease: "power1.out" },
              0,
            );
          if (end)
            timeline.to(
              end,
              { opacity: 1, duration: 0.16, ease: "power1.out" },
              1.5,
            );
        });
        if (typeof IntersectionObserver === "function") {
          observer = new IntersectionObserver(
            (entries) => {
              visible = entries.some((entry) => entry.isIntersecting);
              if (visible) play();
            },
            { threshold: 0.25 },
          );
          observer.observe(element);
          const picture = element.closest(".ks-story__picture[data-rich]");
          if (picture && typeof MutationObserver === "function") {
            activation = new MutationObserver(() => play());
            activation.observe(picture, {
              attributes: true,
              attributeFilter: ["data-active"],
            });
          }
        } else {
          visible = true;
          play();
        }
        return () => {
          observer?.disconnect();
          activation?.disconnect();
          timeline?.kill();
          element.dataset.inkState = "complete";
        };
      });
      return () => media.revert();
    },
    { scope: root },
  );
  return (
    <Root ref={root} className={className}>
      {children}
    </Root>
  );
}
