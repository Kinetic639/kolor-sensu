"use client";

// A short story told while scrolling (after David Whyte Experience, where
// painted scenes give way to one another as you read): a few steps, each a
// few lines of text and a picture.
//
// From 64 rem up, with motion welcome, the section pins one screen in place
// for as long as it takes to scroll through its steps. The text column
// changes step by step, and each new step's picture is painted over the
// previous one with the same brush strokes WatercolorImage's entrance uses
// (watercolor-paint-matte.ts). Scrolling back lifts the later pictures off
// again.
//
// Where the story is, is told by one counter over the text ("01 / 03"):
// when the step changes its number rolls, the old one leaving upwards
// into mist, the new one coming up sharp.

import type { ScrollTrigger as ScrollTriggerInstance } from "gsap/ScrollTrigger";
import type { ImageProps } from "next/image";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { type GsapInstance, useLazyGsap } from "./lazy-gsap";
import { cn } from "../lib/utils";
import { HanddrawnLink } from "./handdrawn-link";
import { matches, svgMasksSupported, watchReveal } from "./reveal-support";
import { EditorialHeading, SectionEyebrow } from "./typography";
import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader } from "./section-header";
import { revealProperties } from "./watercolor-reveal";
import { WatercolorImage, type WatercolorLook } from "./watercolor-image";
import {
  createPaintMatte,
  createPaintTimeline,
  type PaintMatte,
} from "./watercolor-paint-matte";

export interface PaintedStoryStep {
  /** Server-rendered educational composition; the image remains its fallback. */
  content?: ReactNode;
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
  /**
   * The header as the CMS edits it (words and colours; the markup stays
   * this section's). When given, it replaces eyebrow, heading and
   * description.
   */
  header?: SectionHeaderContent;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  steps: readonly PaintedStoryStep[];
  /** The painted photo's backdrop and parallax layer (WatercolorImage). */
  watercolor?: WatercolorLook;
  id?: string;
  className?: string;
}

const PINNED = "(min-width: 64rem) and (prefers-reduced-motion: no-preference)";
const FLOWING =
  "(max-width: 63.99rem) and (prefers-reduced-motion: no-preference)";

/** Paints a picture's layers in with the brush; resolves the old state. */
function paint(gsap: GsapInstance, picture: HTMLElement, onDone?: () => void) {
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
    gsap,
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
  header,
  eyebrow,
  heading,
  steps,
  watercolor,
  id,
  className,
}: PaintedStoryProps) {
  const ref = useRef<HTMLElement>(null);
  const total = steps.length;
  const composed = steps.some((step) => !!step.content);
  const numbered = (value: number) => String(value).padStart(2, "0");

  useLazyGsap(
    ({ gsap, ScrollTrigger }) => {
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
      const digits = Array.from(
        root.querySelectorAll<HTMLElement>(".ks-story__counter-digit"),
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
                  paint(gsap, picture, () => stops.delete(at)),
                );
            } else if (at > index && picture.dataset.shown === "true") {
              stops.get(at)?.();
              stops.delete(at);
              delete picture.dataset.shown;
            }
            if (at === index) picture.dataset.active = "true";
            else delete picture.dataset.active;
            picture.inert = at !== index;
          });
          texts.forEach((text, at) => {
            if (at === index) text.dataset.active = "true";
            else delete text.dataset.active;
            text.inert = at !== index;
          });
          count(index);
          active = index;
        };
        // The counter: which number shows.
        const count = (index: number) => {
          digits.forEach((digit, at) => {
            if (at === index) digit.dataset.active = "true";
            else delete digit.dataset.active;
          });
          root.style.setProperty("--ks-story-step", String(index));
        };

        // The first picture is painted when the section comes into view;
        // after that, scrolling chooses the step.
        texts[0]!.dataset.active = "true";
        texts.forEach((text, at) => (text.inert = at !== 0));
        pictures.forEach((picture, at) => {
          picture.inert = at !== 0;
          if (at === 0) picture.dataset.active = "true";
        });
        // Every rich slide shares the same stage. Scale the entire composition
        // uniformly when a short screen cannot fit the tallest card.
        const resizeMedia = () => {
          const content = pictures.flatMap((picture) => [
            ...picture.querySelectorAll<HTMLElement>(".ks-story__media"),
          ]);
          const tallest = Math.max(
            0,
            ...content.map((node) => node.offsetHeight),
          );
          const available = pictures[0]?.clientHeight ?? 0;
          root.style.setProperty(
            "--ks-story-media-scale",
            String(tallest && available ? Math.min(1, available / tallest) : 1),
          );
        };
        const resizeObserver =
          typeof ResizeObserver === "function"
            ? new ResizeObserver(resizeMedia)
            : null;
        pictures.forEach((picture) => {
          resizeObserver?.observe(picture);
          picture
            .querySelectorAll(".ks-story__media")
            .forEach((node) => resizeObserver?.observe(node));
        });
        resizeMedia();
        count(0);
        let started = false;
        const stopWatch = watchReveal(root, {
          threshold: 0.3,
          near: () => undefined,
          visible: () => {
            started = true;
            if (active < 0) show(0);
          },
        });
        const follow = (self: ScrollTriggerInstance) => {
          if (!started) return;
          show(Math.min(steps.length - 1, Math.floor(self.progress * total)));
        };
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          onUpdate: follow,
          onRefresh: follow,
        });

        return () => {
          resizeObserver?.disconnect();
          root.style.removeProperty("--ks-story-media-scale");
          stopWatch();
          trigger.kill();
          stops.forEach((stop) => stop());
          for (const element of [...texts, ...pictures, ...digits]) {
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
              stopPaint = paint(gsap, picture);
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
      style={{ "--ks-story-steps": total } as CSSProperties}
    >
      <div className="ks-story__stage max-w-page px-gutter mx-auto">
        {header ? (
          <SectionHeader
            content={header}
            size="h3"
            className="ks-story__intro"
          />
        ) : (
          <div className="ks-story__intro grid gap-3">
            {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
            <EditorialHeading size="h3">{heading}</EditorialHeading>
          </div>
        )}
        {/* The pinned story's one counter (each step's own count, below,
            is for the steps that follow one another). */}
        <div className="ks-story__counter font-display" aria-hidden="true">
          <span className="ks-story__counter-window">
            <span className="ks-story__counter-reel">
              {steps.map((_, index) => (
                <span key={index} className="ks-story__counter-digit">
                  {numbered(index + 1)}
                </span>
              ))}
            </span>
          </span>
          <span className="ks-story__counter-total">
            {"/ "}
            {numbered(total)}
          </span>
        </div>
        {steps.map((step, index) => (
          <div key={index} className="ks-story__step">
            <div className="ks-story__text grid gap-4">
              <p
                className="ks-story__count font-display text-pink-strong"
                aria-hidden="true"
              >
                {numbered(index + 1)}
                <span className="text-text-muted">
                  {" / "}
                  {numbered(total)}
                </span>
              </p>
              <EditorialHeading as="h3" size="h2">
                {step.heading}
              </EditorialHeading>
              <p className="max-w-copy text-body text-text-muted">
                {step.text}
              </p>
              {step.cta ? (
                <HanddrawnLink
                  href={step.cta.href}
                  className="justify-self-start"
                >
                  {step.cta.label}
                </HanddrawnLink>
              ) : null}
            </div>
            <div
              className="ks-story__picture"
              data-rich={composed ? "true" : undefined}
            >
              <div className="ks-story__media">
                {step.content ?? (
                  <WatercolorImage
                    src={step.image.src}
                    alt={step.image.alt}
                    objectPosition={step.image.objectPosition}
                    {...watercolor}
                    sizes="(min-width: 1024px) 62vw, calc(117vw - 3rem)"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
