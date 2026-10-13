"use client";

// "Pierwszy krok": four steps of starting therapy on a compact band, each
// a watercolour circle with a line icon, a name and a sentence, joined by a
// wave that comes from the heading, runs through the circles and ends in
// the last one (first-steps-wave.ts). Behind them lies the supplied brush
// stroke, pink flowing into sage.
//
// With motion welcome the band waits grey: the circles colourless, the
// names faint, the sentences hidden. As it comes up the screen the stroke
// behind fills in from both sides to the middle (a threshold on its time
// map, first-steps-matte.ts, after #11's scroll story).
//
// From 64 rem the band then holds still in the middle of the screen (as
// PaintedStory does) and only then scrolling draws the wave from the left,
// pink turning to green, a drop of paint riding its tip. When the line
// gets to a step, the step takes colour for good: paint spreads through
// the circle, a ring ripples out of it, the icon settles (the last step's
// sprout grows), the name darkens and the sentence comes up under it;
// coloured circles breathe, slowly. Scrolling back takes the wave back,
// never the steps. Below 64 rem there is no wave and nothing holds: each
// step takes colour as it comes into view.
//
// The script only says how far things are (the wave's dash,
// --ks-steps-progress, data-bloomed, the matte's front); public-site.css
// draws everything. Under reduced motion, or with no script, it is simply
// the finished band.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileText, Phone, Sprout, Users } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useId, useRef } from "react";
import { cn } from "../lib/utils";
import { createScrollMatte } from "./first-steps-matte";
import { stepsReached, WAVE_PATH } from "./first-steps-wave";
import { matches, svgMasksSupported } from "./reveal-support";
import { EditorialHeading, SectionEyebrow } from "./typography";

gsap.registerPlugin(useGSAP);

export const firstStepsRibbonSrc = "/watercolor/first-steps-ribbon.webp";
const ribbonTimeSrc = "/watercolor/first-steps-ribbon-time.png";

const HELD = "(min-width: 64rem)";
const FLOWING = "(max-width: 63.99rem)";
// The wave is finished this far through the hold; the rest is a breath
// with the whole band in colour before the page moves on.
const WAVE_SHARE = 0.82;

export interface FirstStepsProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  /** Four steps, first to last. */
  steps: readonly { title: string; text: string }[];
  id?: string;
  className?: string;
}

// Contact, the first meeting, the plan, the start: one icon per place.
const ICONS = [Phone, Users, FileText, Sprout];

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Shows the wave drawn to `progress` (0 to 1): its dash, the steps it has
 * reached in colour (for good), and the progress as a CSS variable for the
 * drop at its tip.
 */
export function showProgress(root: HTMLElement, progress: number) {
  const value = round(progress);
  root.style.setProperty("--ks-steps-progress", String(value));
  const line = root.querySelector<SVGPathElement>(".ks-steps__wave-line");
  if (line) line.style.strokeDashoffset = String(round(1 - value));
  const reached = stepsReached(value);
  root
    .querySelectorAll<HTMLElement>(".ks-steps__step")
    .forEach((step, index) => {
      if (index < reached) step.setAttribute("data-bloomed", "");
    });
}

export function FirstSteps({
  eyebrow,
  heading,
  description,
  steps,
  id,
  className,
}: FirstStepsProps) {
  const ref = useRef<HTMLElement>(null);
  const headingId = useId();
  const gradientId = useId();

  useGSAP(
    () => {
      const root = ref.current;
      if (
        !root ||
        !matches("(scripting: enabled)") ||
        matches("(prefers-reduced-motion: reduce)")
      ) {
        return;
      }
      // Registered here, not at module scope: ScrollTrigger reaches for
      // matchMedia as soon as it is registered, and the guard above already
      // established that it exists.
      gsap.registerPlugin(ScrollTrigger);

      const stage = root.querySelector<HTMLElement>(".ks-steps__stage")!;
      const ribbon = root.querySelector<HTMLElement>(".ks-steps__ribbon");
      const line = root.querySelector<SVGPathElement>(".ks-steps__wave-line");
      const drop = root.querySelector<HTMLElement>(".ks-steps__drop");
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(".ks-steps__step"),
      );
      const matte =
        ribbon && svgMasksSupported()
          ? createScrollMatte(root, ribbonTimeSrc, {
              onReady: () => {
                ribbon.style.setProperty("mask-image", matte!.url);
                ribbon.style.setProperty("-webkit-mask-image", matte!.url);
              },
            })
          : null;
      root.dataset.armed = "true";

      // The stroke follows the scroll with a little lag, like a wet brush.
      const paint = { front: 0 };
      const brush = gsap.quickTo(paint, "front", {
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => matte?.set(paint.front),
      });

      const media = gsap.matchMedia();

      media.add(HELD, () => {
        root.dataset.held = "true";
        // Where the band holds: the middle of the screen.
        const top = () => {
          const at = Math.max(
            0,
            Math.round((window.innerHeight - stage.offsetHeight) / 2),
          );
          root.style.setProperty("--ks-steps-top", `${at}px`);
          return at;
        };
        const length =
          line && typeof line.getTotalLength === "function"
            ? line.getTotalLength()
            : 0;
        const wave = { progress: 0 };
        const draw = () => {
          showProgress(root, wave.progress);
          if (drop && line && length > 0) {
            // The wave's space is 1000 x 100, stretched over its box: the
            // row's width and the circles' height.
            const tip = line.getPointAtLength(length * wave.progress);
            drop.style.left = `${tip.x / 10}%`;
            drop.style.top = `calc(var(--ks-steps-bubble) * ${tip.y / 100})`;
          }
        };
        draw();
        const follow = gsap.quickTo(wave, "progress", {
          duration: 0.45,
          ease: "power2.out",
          onUpdate: draw,
        });
        // The stroke, while the band comes up to its place... (onRefresh
        // as well: a page opened or reloaded further down never "updates"
        // a trigger it is already past.)
        const approach = ScrollTrigger.create({
          trigger: root,
          start: "top 92%",
          end: () => `top ${top()}px`,
          onUpdate: (self) => brush(self.progress),
          onRefresh: (self) => brush(self.progress),
        });
        // ...and the wave, once it holds there.
        const hold = ScrollTrigger.create({
          trigger: root,
          start: () => `top ${top()}px`,
          end: () => `+=${Math.max(1, root.offsetHeight - stage.offsetHeight)}`,
          onUpdate: (self) => follow(Math.min(1, self.progress / WAVE_SHARE)),
          onRefresh: (self) => follow(Math.min(1, self.progress / WAVE_SHARE)),
        });

        return () => {
          approach.kill();
          hold.kill();
          gsap.killTweensOf(wave);
          delete root.dataset.held;
          root.style.removeProperty("--ks-steps-top");
          root.style.removeProperty("--ks-steps-progress");
          line?.style.removeProperty("stroke-dashoffset");
        };
      });

      media.add(FLOWING, () => {
        const approach = ScrollTrigger.create({
          trigger: root,
          start: "top 85%",
          end: "top 25%",
          onUpdate: (self) => brush(self.progress),
          onRefresh: (self) => brush(self.progress),
        });
        const arrivals = items.map((step) =>
          ScrollTrigger.create({
            trigger: step,
            start: "top 78%",
            once: true,
            onEnter: () => step.setAttribute("data-bloomed", ""),
          }),
        );
        return () => {
          approach.kill();
          arrivals.forEach((arrival) => arrival.kill());
        };
      });

      return () => {
        media.revert();
        gsap.killTweensOf(paint);
        matte?.remove();
        ribbon?.style.removeProperty("mask-image");
        ribbon?.style.removeProperty("-webkit-mask-image");
        items.forEach((step) => step.removeAttribute("data-bloomed"));
        delete root.dataset.armed;
      };
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={headingId}
      className={cn("ks-steps", className)}
    >
      <div className="ks-steps__stage py-section">
        <div className="ks-steps__ribbon" aria-hidden="true">
          <Image
            src={firstStepsRibbonSrc}
            alt=""
            fill
            sizes="110vw"
            loading="eager"
          />
        </div>
        <div className="ks-steps__inner max-w-page px-gutter mx-auto">
          <header className="grid content-start gap-3">
            {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
            <EditorialHeading id={headingId} size="h3">
              {heading}
            </EditorialHeading>
            {description ? (
              <p className="text-body text-text-muted">{description}</p>
            ) : null}
          </header>
          <div className="ks-steps__track">
            <svg
              className="ks-steps__wave"
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                {/* Pink, then green, changing quickly in the middle (as the
                    stroke behind does): mixed evenly they would pass
                    through brown. */}
                <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="var(--color-pink)" />
                  <stop offset="0.44" stopColor="var(--color-pink)" />
                  <stop offset="0.56" stopColor="var(--color-primary)" />
                  <stop offset="1" stopColor="var(--color-primary)" />
                </linearGradient>
              </defs>
              {/* No non-scaling stroke: with it the dash would be measured
                  on screen and run ahead of the drop. */}
              <path className="ks-steps__wave-ghost" d={WAVE_PATH} />
              <path
                className="ks-steps__wave-line"
                d={WAVE_PATH}
                pathLength={1}
                stroke={`url(#${gradientId})`}
              />
            </svg>
            <span className="ks-steps__drop" aria-hidden="true" />
            <ol className="ks-steps__list">
              {steps.map((step, index) => {
                const Icon = ICONS[index % ICONS.length]!;
                return (
                  <li
                    key={step.title}
                    className="ks-steps__step"
                    data-tone={index % 2 === 0 ? "sage" : "pink"}
                  >
                    <span className="ks-steps__bubble">
                      <span className="ks-steps__wash" />
                      <span className="ks-steps__ring" />
                      <span className="ks-steps__icon">
                        <Icon aria-hidden="true" strokeWidth={1.5} />
                      </span>
                    </span>
                    <h3 className="ks-steps__title font-display">
                      {step.title}
                    </h3>
                    <p className="ks-steps__text">{step.text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
