"use client";

// A short story told while scrolling (after David Whyte Experience, where
// painted scenes give way to one another as you read): a few steps, each a
// few lines of text and a picture.
//
// From 64 rem up, with motion welcome, the section pins one screen in place
// for as long as it takes to scroll through its steps. The text column
// changes step by step, and each new step's picture is painted over the
// previous one with the same brush strokes WatercolorImage's entrance uses
// (watercolor-paint-matte.ts). Between the two runs the tracker: the wave
// of FirstSteps stood on end (painted-story-wave.ts), a point per step; the
// line draws itself down to each step's point as that step begins, and the
// points it has reached take colour, the current one largest. Scrolling
// back lifts the later pictures off again and takes the line back.
//
// On phones, under reduced motion and without a script, the steps simply
// follow one another: text, then picture; on phones each picture is still
// painted in as it comes into view. Safari (no SVG masks on HTML elements)
// gets a short cross-fade instead of the brush.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ImageProps } from "next/image";
import { type CSSProperties, type ReactNode, useId, useRef } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { storyWave, storyWaveDrawn } from "./painted-story-wave";
import { matches, svgMasksSupported, watchReveal } from "./reveal-support";
import { EditorialHeading, SectionEyebrow } from "./typography";
import { revealProperties } from "./watercolor-reveal";
import { WatercolorImage } from "./watercolor-image";
import {
  createPaintMatte,
  createPaintTimeline,
  type PaintMatte,
} from "./watercolor-paint-matte";

gsap.registerPlugin(useGSAP);

export interface PaintedStoryStep {
  heading: ReactNode;
  text: ReactNode;
  cta?: { href: string; label: ReactNode };
  image: {
    src: ImageProps["src"];
    alt: string;
    objectPosition?: string;
  };
}

export interface PaintedStoryProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  steps: readonly PaintedStoryStep[];
  id?: string;
  className?: string;
}

const PINNED = "(min-width: 64rem) and (prefers-reduced-motion: no-preference)";
const FLOWING =
  "(max-width: 63.99rem) and (prefers-reduced-motion: no-preference)";

/** Paints a picture's layers in with the brush; resolves the old state. */
function paint(picture: HTMLElement, onDone?: () => void) {
  const frame = picture.querySelector<HTMLElement>(".ks-wc");
  if (!frame || !svgMasksSupported()) {
    picture.dataset.shown = "true";
    onDone?.();
    return () => undefined;
  }
  frame.dataset.animation = "watercolor-reveal";
  const matte: PaintMatte = createPaintMatte(frame);
  frame.style.setProperty(revealProperties.backdrop, matte.backdrop.url);
  frame.style.setProperty(revealProperties.photo, matte.photo.url);
  frame.dataset.reveal = "playing";
  picture.dataset.shown = "true";
  const clear = () => {
    frame.dataset.reveal = "done";
    frame.style.removeProperty(revealProperties.backdrop);
    frame.style.removeProperty(revealProperties.photo);
    if (frame.getAttribute("style") === "") frame.removeAttribute("style");
    matte.svg.remove();
  };
  const timeline = createPaintTimeline(matte, {
    onComplete: () => {
      clear();
      onDone?.();
    },
  });
  return () => {
    timeline.kill();
    clear();
  };
}

export function PaintedStory({
  eyebrow,
  heading,
  steps,
  id,
  className,
}: PaintedStoryProps) {
  const ref = useRef<HTMLElement>(null);
  const gradientId = useId();
  const count = steps.length;
  const wave = storyWave(count);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !matches("(scripting: enabled)")) return;
      // Registered here, not at module scope: ScrollTrigger reaches for
      // matchMedia as soon as it is registered, and the guard above already
      // established that it exists.
      gsap.registerPlugin(ScrollTrigger);
      const texts = Array.from(
        root.querySelectorAll<HTMLElement>(".ks-story__text"),
      );
      const pictures = Array.from(
        root.querySelectorAll<HTMLElement>(".ks-story__picture"),
      );
      const dots = Array.from(
        root.querySelectorAll<HTMLElement>(".ks-story__dot"),
      );
      const waveLine = root.querySelector<SVGPathElement>(
        ".ks-story__wave-line",
      );
      const media = gsap.matchMedia();

      media.add(PINNED, () => {
        root.dataset.pinned = "true";
        const stops = new Map<number, () => void>();
        let active = -1;

        const show = (index: number) => {
          if (index === active) return;
          pictures.forEach((picture, at) => {
            if (at <= index && picture.dataset.shown !== "true") {
              // Steps skipped by a fast scroll appear at once; only the
              // step arrived at is painted.
              if (at < index) picture.dataset.shown = "true";
              else
                stops.set(
                  at,
                  paint(picture, () => stops.delete(at)),
                );
            } else if (at > index && picture.dataset.shown === "true") {
              stops.get(at)?.();
              stops.delete(at);
              delete picture.dataset.shown;
            }
          });
          texts.forEach((text, at) => {
            if (at === index) text.dataset.active = "true";
            else delete text.dataset.active;
            text.inert = at !== index;
          });
          dots.forEach((dot, at) => {
            if (at <= index) dot.dataset.reached = "true";
            else delete dot.dataset.reached;
            if (at === index) dot.dataset.active = "true";
            else delete dot.dataset.active;
          });
          root.style.setProperty("--ks-story-step", String(index));
          active = index;
        };

        // The first picture is painted when the section comes into view;
        // after that, scrolling chooses the step.
        texts[0]!.dataset.active = "true";
        texts.forEach((text, at) => (text.inert = at !== 0));
        let started = false;
        const stopWatch = watchReveal(root, {
          threshold: 0.3,
          near: () => undefined,
          visible: () => {
            started = true;
            if (active < 0) show(0);
          },
        });
        // The tracker's line follows the scroll with a little lag.
        const drawn = { share: 0 };
        const draw = () => {
          if (waveLine) {
            waveLine.style.strokeDashoffset = String(
              Math.round((1 - drawn.share) * 1000) / 1000,
            );
          }
        };
        draw();
        const drawTo = gsap.quickTo(drawn, "share", {
          duration: 0.4,
          ease: "power2.out",
          onUpdate: draw,
        });
        const follow = (self: ScrollTrigger) => {
          drawTo(storyWaveDrawn(self.progress, count));
          if (!started) return;
          show(Math.min(count - 1, Math.floor(self.progress * count)));
        };
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          onUpdate: follow,
          onRefresh: follow,
        });

        return () => {
          stopWatch();
          trigger.kill();
          gsap.killTweensOf(drawn);
          waveLine?.style.removeProperty("stroke-dashoffset");
          stops.forEach((stop) => stop());
          for (const element of [...texts, ...pictures, ...dots]) {
            delete element.dataset.reached;
            delete element.dataset.active;
            delete element.dataset.shown;
            element.inert = false;
          }
          root.style.removeProperty("--ks-story-step");
          delete root.dataset.pinned;
        };
      });

      media.add(FLOWING, () => {
        const stops = pictures.map((picture) => {
          let stopPaint: (() => void) | undefined;
          const stopWatch = watchReveal(picture, {
            threshold: 0.3,
            near: () => undefined,
            visible: () => {
              stopPaint = paint(picture);
            },
          });
          return () => {
            stopWatch();
            stopPaint?.();
          };
        });
        root.dataset.flowing = "true";
        return () => {
          stops.forEach((stop) => stop());
          pictures.forEach((picture) => delete picture.dataset.shown);
          delete root.dataset.flowing;
        };
      });

      return () => media.revert();
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id={id}
      className={cn("ks-story", className)}
      style={{ "--ks-story-steps": count } as CSSProperties}
    >
      <div className="ks-story__stage max-w-page px-gutter mx-auto">
        <div className="ks-story__intro grid gap-3">
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <EditorialHeading size="h3">{heading}</EditorialHeading>
        </div>
        <div className="ks-story__line" aria-hidden="true">
          <svg
            className="ks-story__wave"
            viewBox="0 0 50 1000"
            preserveAspectRatio="none"
            focusable="false"
          >
            <defs>
              {/* Pink, then green, changing quickly in the middle, as in
                  FirstSteps: mixed evenly they would pass through brown.
                  In the tracker's own space: a straight line (a story of
                  one step) has no box to measure a gradient by. */}
              <linearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="0"
                y1="0"
                y2="1000"
              >
                <stop offset="0" stopColor="var(--color-pink)" />
                <stop offset="0.44" stopColor="var(--color-pink)" />
                <stop offset="0.56" stopColor="var(--color-primary)" />
                <stop offset="1" stopColor="var(--color-primary)" />
              </linearGradient>
            </defs>
            <path className="ks-story__wave-ghost" d={wave.path} />
            <path
              className="ks-story__wave-line"
              d={wave.path}
              pathLength={1}
              stroke={`url(#${gradientId})`}
            />
          </svg>
          {wave.points.map((y) => (
            <span
              key={y}
              className="ks-story__dot"
              data-tone={y < 500 ? "pink" : "sage"}
              style={{ top: `${y / 10}%` }}
            />
          ))}
        </div>
        {steps.map((step, index) => (
          <div key={index} className="ks-story__step">
            <div className="ks-story__text grid gap-4">
              <p
                className="ks-story__count font-display text-pink-strong"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
                <span className="text-text-muted">
                  {" / "}
                  {String(count).padStart(2, "0")}
                </span>
              </p>
              <EditorialHeading as="h3" size="h2">
                {step.heading}
              </EditorialHeading>
              <p className="max-w-copy text-body text-text-muted">
                {step.text}
              </p>
              {step.cta ? (
                <ArrowLink href={step.cta.href} className="justify-self-start">
                  {step.cta.label}
                </ArrowLink>
              ) : null}
            </div>
            <div className="ks-story__picture">
              <WatercolorImage
                src={step.image.src}
                alt={step.image.alt}
                objectPosition={step.image.objectPosition}
                sizes="(min-width: 1024px) 62vw, 117vw"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
