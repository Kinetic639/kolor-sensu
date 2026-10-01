"use client";

// "Z czym przychodzisz?": the reasons people come, laid out like paint on a
// table (after Talking Walls' guidance section). In the middle, a large
// patch of watercolour with the chosen topic: a few words about it and the
// way to start. Around it, small patches of paint, each a topic. Choosing
// one paints its colour over the middle from the side it came from, and the
// words change with it.
//
// From 64 rem up the small patches stand around the middle in two groups
// that drift at different speeds as the page scrolls, so they slide past
// each other. On phones the middle comes first and the topics wrap below it
// as a row of small patches. The topics are real buttons (aria-pressed) and
// the middle a polite live region, so the section works from the keyboard
// and a screen reader; without a script it shows the first topic.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Image from "next/image";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { ArrowLink, PrimaryButton } from "./actions";
import { PageLink as Link } from "./page-link";
import { matches } from "./reveal-support";
import { EditorialHeading, SectionEyebrow } from "./typography";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export type TopicPaint = "pink-1" | "pink-2" | "sage-1" | "sage-2";

export interface Topic {
  /** The word on the small patch: "Lęk". */
  label: string;
  /** The middle's heading: "Gdy niepokój nie odpuszcza". */
  title: string;
  text: ReactNode;
  paint: TopicPaint;
}

export interface TopicGuideProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  topics: readonly Topic[];
  /** The way to start, the same for every topic. */
  action: { href: string; label: ReactNode };
  more?: { href: string; label: ReactNode };
  id?: string;
  className?: string;
}

const middlePaint = (paint: TopicPaint) => `/watercolor/offer-${paint}.png`;

// Where the small patches stand around the middle (percent of the table),
// their width (rem) and tilt; even ones drift slower than odd ones.
const PLACES = [
  { x: 9, y: 12, w: 8.5, r: -5 },
  { x: 81, y: 8, w: 9.5, r: 4 },
  { x: 22, y: 41, w: 7.5, r: 3 },
  { x: 93, y: 37, w: 8, r: -3 },
  { x: 6, y: 66, w: 9.5, r: 4 },
  { x: 77, y: 63, w: 7.5, r: -5 },
  { x: 21, y: 90, w: 8, r: -2 },
  { x: 91, y: 89, w: 9, r: 3 },
] as const;

export function TopicGuide({
  eyebrow,
  heading,
  description,
  topics,
  action,
  more,
  id,
  className,
}: TopicGuideProps) {
  const ref = useRef<HTMLElement>(null);
  const middleRef = useRef<HTMLDivElement>(null);
  const origin = useRef("50% 50%");
  const [active, setActive] = useState(0);
  const topic = topics[active]!;

  // The patches drift at two speeds (wide screens only).
  useGSAP(
    () => {
      const root = ref.current;
      if (!root || matches("(prefers-reduced-motion: reduce)")) return;
      const media = gsap.matchMedia();
      media.add("(min-width: 64rem)", () => {
        const patches = root.querySelectorAll(".ks-topics__patch");
        patches.forEach((patch, index) => {
          gsap.fromTo(
            patch,
            { yPercent: index % 2 ? 45 : 18 },
            {
              yPercent: index % 2 ? -45 : -18,
              ease: "none",
              scrollTrigger: {
                trigger: root,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
      });
      return () => media.revert();
    },
    { scope: ref },
  );

  // A new topic: its paint spreads over the middle from the chosen patch,
  // and its words rise into place.
  useGSAP(
    () => {
      const middle = middleRef.current;
      if (!middle || matches("(prefers-reduced-motion: reduce)")) return;
      const layers = middle.querySelectorAll<HTMLElement>(".ks-topics__paint");
      const layer = layers[active];
      const copy = middle.querySelector<HTMLElement>(".ks-topics__copy");
      if (!layer || !copy || middle.dataset.ready !== "true") {
        middle.dataset.ready = "true";
        return;
      }
      layers.forEach((other) => {
        other.style.zIndex =
          other === layer ? "2" : other.dataset.shown ? "1" : "0";
      });
      gsap.fromTo(
        layer,
        { clipPath: `circle(0% at ${origin.current})`, scale: 1.04 },
        {
          clipPath: `circle(80% at 50% 50%)`,
          scale: 1,
          duration: 1.25,
          ease: "expo.inOut",
          onComplete: () => {
            layers.forEach((other) => {
              if (other !== layer) delete other.dataset.shown;
            });
            gsap.set(layer, { clearProps: "clipPath,scale" });
          },
        },
      );
      layer.dataset.shown = "true";

      const title = copy.querySelector("h3");
      const rest = copy.querySelectorAll(":scope > :not(h3)");
      if (title) {
        const split = SplitText.create(title, { type: "words" });
        gsap.fromTo(
          split.words,
          { yPercent: 60, rotate: 2.5, autoAlpha: 0 },
          {
            yPercent: 0,
            rotate: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "back.out(1.4)",
            stagger: 0.05,
            delay: 0.35,
            onComplete: () => split.revert(),
          },
        );
      }
      gsap.fromTo(
        rest,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.6,
          clearProps: "opacity,visibility,transform",
        },
      );
    },
    { scope: middleRef, dependencies: [active] },
  );

  const choose = (index: number, button: HTMLButtonElement) => {
    const middle = middleRef.current;
    const paint = middle?.querySelector(".ks-topics__paint");
    if (paint) {
      const box = paint.getBoundingClientRect();
      const from = button.getBoundingClientRect();
      const x = ((from.left + from.width / 2 - box.left) / box.width) * 100;
      const y = ((from.top + from.height / 2 - box.top) / box.height) * 100;
      origin.current = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    }
    setActive(index);
    // On phones the topics sit below the middle: bring it back into view.
    if (middle && !matches("(min-width: 64rem)")) {
      const box = middle.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) {
        middle.scrollIntoView({
          behavior: matches("(prefers-reduced-motion: reduce)")
            ? "auto"
            : "smooth",
          block: "center",
        });
      }
    }
  };

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "ks-topics max-w-page px-gutter py-section mx-auto",
        className,
      )}
    >
      <div
        className="mx-auto grid max-w-[40rem] justify-items-center gap-4 text-center"
        data-motion="text"
      >
        {eyebrow ? (
          <SectionEyebrow className="text-pink-strong">
            {eyebrow}
          </SectionEyebrow>
        ) : null}
        <EditorialHeading size="h2">{heading}</EditorialHeading>
        {description ? (
          <p className="text-body text-text-muted">{description}</p>
        ) : null}
      </div>

      <div className="ks-topics__table">
        <div ref={middleRef} className="ks-topics__middle">
          {topics.map((item, index) => (
            <div
              key={item.label}
              className="ks-topics__paint"
              data-shown={index === 0 ? "true" : undefined}
              aria-hidden="true"
            >
              <Image
                src={middlePaint(item.paint)}
                alt=""
                fill
                sizes="(min-width: 64rem) 34rem, 100vw"
                loading="lazy"
              />
            </div>
          ))}
          <div
            key={active}
            className="ks-topics__copy"
            aria-live="polite"
            id={id ? `${id}-topic` : undefined}
          >
            <p className="ks-topics__label font-hand text-pink-strong">
              {topic.label}
            </p>
            <EditorialHeading as="h3" size="h3">
              {topic.title}
            </EditorialHeading>
            <p className="text-small text-ink/80">{topic.text}</p>
            <div className="mt-1 grid justify-items-center gap-3">
              <PrimaryButton asChild arrow size="sm">
                <Link href={action.href}>{action.label}</Link>
              </PrimaryButton>
              {more ? (
                <ArrowLink href={more.href}>{more.label}</ArrowLink>
              ) : null}
            </div>
          </div>
        </div>

        <ul className="ks-topics__patches" aria-label="Tematy">
          {topics.map((item, index) => {
            const place = PLACES[index % PLACES.length]!;
            return (
              <li
                key={item.label}
                className="ks-topics__patch"
                style={
                  {
                    "--x": `${place.x}%`,
                    "--y": `${place.y}%`,
                    "--w": `${place.w}rem`,
                    "--r": `${place.r}deg`,
                  } as CSSProperties
                }
              >
                <button
                  type="button"
                  className="ks-topics__button"
                  aria-pressed={index === active}
                  onClick={(event) => choose(index, event.currentTarget)}
                >
                  <Image
                    src={middlePaint(item.paint)}
                    alt=""
                    fill
                    sizes="10rem"
                    loading="lazy"
                    className="ks-topics__button-paint"
                  />
                  <span className="ks-topics__button-label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
