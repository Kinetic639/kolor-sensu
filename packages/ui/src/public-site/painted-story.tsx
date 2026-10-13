"use client";

// A short story told while scrolling (after David Whyte Experience, where
// painted scenes give way to one another as you read): a few steps, each a
// few lines of text and a picture.
//
// From 64 rem up, with motion welcome, the section pins one screen in place
// for as long as it takes to scroll through its steps. The text column
// changes step by step, a thin line fills as the story goes on, and each new
// step's picture is painted over the previous one with the same brush
// strokes WatercolorImage's entrance uses (watercolor-paint-matte.ts).
// Scrolling back lifts the later pictures off again.
//
// On phones, under reduced motion and without a script, the steps simply
// follow one another: text, then picture; on phones each picture is still
// painted in as it comes into view. Safari (no SVG masks on HTML elements)
// gets a short cross-fade instead of the brush.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ImageProps } from "next/image";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
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
  const count = steps.length;

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
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            if (!started) return;
            show(Math.min(count - 1, Math.floor(self.progress * count)));
          },
        });
        const line = gsap.fromTo(
          root.querySelector(".ks-story__line-fill"),
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          },
        );

        return () => {
          stopWatch();
          trigger.kill();
          line.scrollTrigger?.kill();
          line.kill();
          stops.forEach((stop) => stop());
          for (const element of [...texts, ...pictures]) {
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
          <span className="ks-story__line-fill" />
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
