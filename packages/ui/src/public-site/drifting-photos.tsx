"use client";

// A row of photos set down at a slight tilt, like prints on a table (after
// Talking Walls' gallery), under a short intro. The row has no ends: it can
// be dragged with the mouse or a finger, the page's scroll carries it along
// sideways, and the prints lean further while it moves fast and settle back
// when it slows down.
//
// Without a script, or under reduced motion, it is an ordinary row that
// scrolls sideways on its own (scroll snap), the prints still tilted.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Image from "next/image";
import { type ReactNode, useRef } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { matches } from "./reveal-support";
import { EditorialHeading, SectionEyebrow } from "./typography";

gsap.registerPlugin(useGSAP);

export interface DriftingPhoto {
  src: string;
  alt: string;
}

export interface DriftingPhotosProps {
  eyebrow?: ReactNode;
  heading?: ReactNode;
  cta?: { href: string; label: ReactNode };
  photos: readonly DriftingPhoto[];
  className?: string;
}

const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5, -2, 2];
// Sideways travel per pixel of page scroll, and the lean per pixel of speed.
const SCROLL_CARRY = 0.35;
const LEAN = 0.18;

export function DriftingPhotos({
  eyebrow,
  heading,
  cta,
  photos,
  className,
}: DriftingPhotosProps) {
  const ref = useRef<HTMLElement>(null);
  // Enough prints for an endless row on a wide screen: the set repeated.
  const copies = Math.max(2, Math.ceil(10 / Math.max(photos.length, 1)));
  const prints = Array.from({ length: copies }, (_, copy) =>
    photos.map((photo, index) => ({ ...photo, copy, index })),
  ).flat();

  useGSAP(
    () => {
      const root = ref.current;
      const track = root?.querySelector<HTMLElement>(".ks-drift-photos__track");
      if (
        !root ||
        !track ||
        !matches("(scripting: enabled)") ||
        matches("(prefers-reduced-motion: reduce)")
      ) {
        return;
      }
      root.dataset.endless = "true";
      const items = Array.from(track.children) as HTMLElement[];
      const figures = items.map((item) => item.querySelector("figure")!);
      // The CSS rotate property, the one the static page tilts them with.
      const lean = figures.map(
        (figure) => (deg: number) =>
          (figure.style.rotate = `${deg.toFixed(2)}deg`),
      );

      let setWidth = 0;
      const positions: number[] = [];
      const measure = () => {
        let x = 0;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        items.forEach((item, index) => {
          positions[index] = x;
          x += item.offsetWidth + gap;
        });
        setWidth = x / copies;
      };
      measure();

      let drag = 0;
      let dragging = false;
      let lastX = 0;
      let current = 0;
      let speed = 0;
      const scrollAt = () => -window.scrollY * SCROLL_CARRY;
      const wrap = (value: number) => gsap.utils.wrap(-setWidth, 0, value);

      const tick = () => {
        const target = drag + scrollAt();
        const next =
          current + (target - current) * 0.12 * gsap.ticker.deltaRatio();
        const velocity = next - current;
        current = next;
        speed += (velocity - speed) * 0.15;
        const offset = wrap(current);
        const tilt = gsap.utils.clamp(-9, 9, speed * LEAN * 10);
        items.forEach((item, index) => {
          let x = positions[index]! + offset;
          // Prints that left on the left come back on the right.
          if (x < -item.offsetWidth * 1.5) x += setWidth * copies;
          item.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
          lean[index]!(TILTS[index % TILTS.length]! + tilt);
        });
      };

      const down = (event: PointerEvent) => {
        dragging = true;
        lastX = event.clientX;
        root.dataset.dragging = "true";
        track.setPointerCapture(event.pointerId);
      };
      const move = (event: PointerEvent) => {
        if (!dragging) return;
        drag += (event.clientX - lastX) * 1.2;
        lastX = event.clientX;
      };
      const up = (event: PointerEvent) => {
        dragging = false;
        delete root.dataset.dragging;
        if (track.hasPointerCapture(event.pointerId)) {
          track.releasePointerCapture(event.pointerId);
        }
      };

      let running = false;
      const visibility = new IntersectionObserver(([entry]) => {
        const on = Boolean(entry?.isIntersecting);
        if (on === running) return;
        running = on;
        if (on) gsap.ticker.add(tick);
        else gsap.ticker.remove(tick);
      });
      visibility.observe(root);
      current = drag + scrollAt();
      window.addEventListener("resize", measure);
      track.addEventListener("pointerdown", down);
      track.addEventListener("pointermove", move);
      track.addEventListener("pointerup", up);
      track.addEventListener("pointercancel", up);
      tick();

      return () => {
        gsap.ticker.remove(tick);
        visibility.disconnect();
        window.removeEventListener("resize", measure);
        track.removeEventListener("pointerdown", down);
        track.removeEventListener("pointermove", move);
        track.removeEventListener("pointerup", up);
        track.removeEventListener("pointercancel", up);
        items.forEach((item) => (item.style.transform = ""));
        figures.forEach((figure, index) => {
          figure.style.rotate = `${TILTS[index % TILTS.length]}deg`;
        });
        delete root.dataset.endless;
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className={cn("ks-drift-photos", className)}>
      {heading ? (
        <div className="max-w-page px-gutter mx-auto flex w-full flex-wrap items-end justify-between gap-6">
          <div className="grid gap-3" data-motion="text">
            {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
            <EditorialHeading size="h2">{heading}</EditorialHeading>
          </div>
          {cta ? <ArrowLink href={cta.href}>{cta.label}</ArrowLink> : null}
        </div>
      ) : null}
      <ul className="ks-drift-photos__track">
        {prints.map((photo) => (
          <li
            key={`${photo.copy}-${photo.index}`}
            aria-hidden={photo.copy > 0 ? true : undefined}
          >
            <figure
              className="ks-drift-photos__print"
              style={{ rotate: `${TILTS[photo.index % TILTS.length]}deg` }}
            >
              <Image
                src={photo.src}
                alt={photo.copy > 0 ? "" : photo.alt}
                fill
                sizes="(min-width: 64rem) 20rem, 60vw"
                loading="lazy"
                draggable={false}
                className="object-cover"
              />
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
