"use client";

// The areas of help ("Obszary wsparcia"), after Talking Walls' art
// counseling gallery: a large circle in the middle and small circles around
// it, at two depths that drift apart as the section scrolls by (pure CSS,
// public-site.css, "Support areas"). Pointing at a small circle, focusing it
// or tapping it shows its area in the large circle: the photo fades in, with
// the area's name, a sentence and where it leads; the large circle is that
// link. An area without a photo is painted in the theme's colours instead,
// its name inside the small circle.
//
// On phones the large circle comes first and the small ones follow in rows.
// The areas are the CMS's (Home → Obszary wsparcia); the section is code's.

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { HanddrawnLink } from "./handdrawn-link";
import { PageLink } from "./page-link";
import { EditorialHeading, SectionEyebrow } from "./typography";
import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader } from "./section-header";
import {
  CircularWatercolorImage,
  circularPaintAppearance,
} from "./watercolor-circle";
import { WatercolorReveal } from "./watercolor-reveal";

export interface SupportAreaItem {
  id: string;
  title: string;
  lead: string;
  image: { src: string; alt: string } | null;
  href: string;
  linkLabel: string;
}

export interface SupportAreasProps {
  /**
   * The header as the CMS edits it (words and colours; the markup stays
   * this section's). When given, it replaces eyebrow, heading and
   * description.
   */
  header?: SectionHeaderContent;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  areas: readonly SupportAreaItem[];
  cta?: { href: string; label: ReactNode };
  id?: string;
  className?: string;
}

/**
 * Where the small circles sit around the large one on wide screens, in
 * percent of the stage and rem, first to tenth; "far" ones drift more as
 * the section scrolls by. Left and right by turns, so any number of areas
 * spreads around.
 */
export const SUPPORT_AREA_SLOTS = [
  { x: 76, y: 20, size: 8, depth: "near" },
  { x: 23, y: 23, size: 9.5, depth: "far" },
  { x: 84, y: 56, size: 6.5, depth: "far" },
  { x: 15, y: 64, size: 7.5, depth: "near" },
  { x: 72, y: 86, size: 9, depth: "near" },
  { x: 30, y: 88, size: 6.5, depth: "far" },
  { x: 92, y: 30, size: 5.5, depth: "near" },
  { x: 8, y: 36, size: 6, depth: "far" },
  { x: 92, y: 80, size: 5.5, depth: "far" },
  { x: 10, y: 88, size: 5, depth: "near" },
] as const;

// Stable per CMS item: irregular starts without server/client randomness.
function revealDelay(id: string) {
  let seed = 2166136261;
  for (const character of id)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  return 0.04 + (seed % 261) / 1000;
}

export function SupportAreas({
  header,
  eyebrow,
  heading,
  description,
  areas,
  cta,
  id,
  className,
}: SupportAreasProps) {
  const headingId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [paintAngles, setPaintAngles] = useState<number[]>([]);
  useLayoutEffect(() => {
    const count = areas.length;
    if (!count) return;
    const values = crypto.getRandomValues(new Uint32Array(count * 2));
    // Spread random angles across the entire turn, then shuffle assignments.
    // The server's stable appearance is replaced before the first paint.
    const angles = Array.from(
      { length: count },
      (_, index) => ((index + values[index]! / 4294967296) * 360) / count,
    );
    for (let index = count - 1; index > 0; index--) {
      const target = values[count + index]! % (index + 1);
      [angles[index], angles[target]] = [angles[target]!, angles[index]!];
    }
    setPaintAngles(angles);
  }, [areas]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !window.matchMedia) return;
    const enabled = window.matchMedia(
      "(min-width: 64rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      stage.style.setProperty("--ks-pointer-x", String(x));
      stage.style.setProperty("--ks-pointer-y", String(y));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const reset = () => {
      x = y = 0;
      schedule();
    };
    const move = (event: PointerEvent) => {
      if (!enabled.matches || event.pointerType === "touch") return;
      const bounds = stage.getBoundingClientRect();
      x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
      );
      y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
      );
      schedule();
    };
    stage.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerleave", reset);
    enabled.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", reset);
      enabled.removeEventListener("change", reset);
      stage.style.removeProperty("--ks-pointer-x");
      stage.style.removeProperty("--ks-pointer-y");
    };
  }, [areas.length]);
  const area = areas[selected] ?? areas[0];
  if (!area) return null;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("ks-areas py-section", className)}
    >
      <div className="max-w-page px-gutter mx-auto grid gap-10">
        {header ? (
          <SectionHeader
            content={header}
            id={headingId}
            align="center"
            className="mx-auto max-w-2xl"
          />
        ) : (
          <header className="mx-auto grid max-w-2xl justify-items-center gap-3 text-center">
            {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
            <EditorialHeading id={headingId}>{heading}</EditorialHeading>
            {description ? (
              <p className="text-body text-text-muted">{description}</p>
            ) : null}
          </header>
        )}

        <div ref={stageRef} className="ks-areas__stage">
          <PageLink href={area.href} className="ks-areas__center">
            <span className="ks-areas__pictures">
              {areas.map((one, index) => {
                const shown = index === selected;
                return one.image ? (
                  <span
                    key={one.id}
                    aria-hidden={shown ? undefined : true}
                    data-shown={shown || undefined}
                    className="ks-areas__picture"
                  >
                    <CircularWatercolorImage
                      src={one.image.src}
                      alt={shown ? one.image.alt : ""}
                      variationKey={one.id}
                      rotation={paintAngles[index]}
                      circularPaint={{
                        variant: "star-trails",
                        edgeBlur: 0.8,
                        direction: index % 2 ? "counterclockwise" : "clockwise",
                      }}
                      animationPreset={
                        index === 0 ? "watercolor-reveal" : "none"
                      }
                      sizes="(min-width: 64rem) 32rem, 90vw"
                    />
                  </span>
                ) : (
                  <span
                    key={one.id}
                    aria-hidden="true"
                    data-shown={shown || undefined}
                    className="ks-areas__picture"
                  >
                    <PaintedAreaCircle
                      index={index}
                      variationKey={one.id}
                      rotation={paintAngles[index]}
                      animate={index === 0}
                      edgeBlur={0.8}
                    />
                  </span>
                );
              })}
            </span>
            <span
              key={area.id}
              className="ks-areas__text"
              data-on-photo={area.image ? true : undefined}
            >
              <span className="ks-areas__title font-display">{area.title}</span>
              <span className="ks-areas__lead">{area.lead}</span>
              <span className="ks-areas__more">
                {area.linkLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </span>
            </span>
          </PageLink>

          {cta ? (
            <HanddrawnLink href={cta.href} className="ks-areas__cta">
              {cta.label}
            </HanddrawnLink>
          ) : null}

          <ul className="ks-areas__orbit">
            {areas.map((one, index) => {
              const slot =
                SUPPORT_AREA_SLOTS[index % SUPPORT_AREA_SLOTS.length]!;
              return (
                <li
                  key={one.id}
                  className="ks-areas__item"
                  data-depth={slot.depth}
                  data-photo={one.image ? true : undefined}
                  style={
                    {
                      "--ks-area-x": `${slot.x}%`,
                      "--ks-area-y": `${slot.y}%`,
                      "--ks-area-size": `${slot.size}rem`,
                      "--ks-pointer-distance": `${(6 + (index % 4) + (slot.depth === "far" ? 3 : 0)) / 4}px`,
                    } as CSSProperties
                  }
                >
                  <button
                    type="button"
                    aria-label={one.title}
                    aria-pressed={index === selected}
                    className="ks-areas__dot"
                    onPointerEnter={() => setSelected(index)}
                    onFocus={() => setSelected(index)}
                    onClick={() => setSelected(index)}
                  >
                    {one.image ? (
                      <>
                        <CircularWatercolorImage
                          src={one.image.src}
                          alt=""
                          variationKey={one.id}
                          rotation={paintAngles[index]}
                          circularPaint={{
                            variant: "star-trails",
                            direction:
                              index % 2 ? "counterclockwise" : "clockwise",
                          }}
                          animationPreset="watercolor-reveal"
                          revealDelay={revealDelay(one.id)}
                          sizes="10rem"
                          className="ks-areas__dot-picture"
                          mark={
                            <span className="ks-areas__photo-caption">
                              <svg
                                className="ks-areas__caption-paper"
                                viewBox="0 0 200 76"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path
                                  d="M10 6 Q91 2 187 6 Q197 7 196 18 L197 60 Q198 70 187 70 Q98 74 12 70 Q3 69 5 58 L3 17 Q2 8 10 6 Z"
                                  fill="var(--color-surface)"
                                  stroke="currentColor"
                                  strokeWidth="0.8"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                              <span className="ks-areas__caption-text">
                                {one.title}
                              </span>
                            </span>
                          }
                        />
                      </>
                    ) : (
                      <PaintedAreaCircle
                        index={index}
                        variationKey={one.id}
                        rotation={paintAngles[index]}
                        label={one.title}
                        delay={revealDelay(one.id)}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** A photo-free composition uses the same paint matte and reveal lifecycle. */
function PaintedAreaCircle({
  index,
  variationKey,
  rotation,
  label,
  animate = true,
  delay = 0,
  edgeBlur,
}: {
  index: number;
  variationKey: string;
  rotation?: number;
  label?: string;
  animate?: boolean;
  delay?: number;
  edgeBlur?: number;
}) {
  const className = "ks-wc ks-wc--circle ks-areas__paint-circle";
  const appearance = circularPaintAppearance(variationKey);
  const style = {
    "--ks-circle-rotation": `${rotation ?? appearance.rotation}deg`,
  } as CSSProperties;
  const layers = (
    <>
      <div className="ks-wc__backdrop" aria-hidden="true">
        <Image
          src={`/watercolor/circle-concepts/painted-circle-0${appearance.variant}.webp`}
          alt=""
          fill
          sizes="(min-width: 64rem) 10rem, 5rem"
        />
      </div>
      {label ? (
        <span className="ks-areas__dot-label ks-areas__paint-label">
          {label}
        </span>
      ) : null}
    </>
  );
  return animate ? (
    <WatercolorReveal
      as="div"
      reducedMotionMode="static"
      delay={delay}
      className={className}
      style={style}
      circularPaint={{
        variant: "star-trails",
        edgeBlur,
        direction: index % 2 ? "counterclockwise" : "clockwise",
      }}
    >
      {layers}
    </WatercolorReveal>
  ) : (
    <div className={className} style={style}>
      {layers}
    </div>
  );
}
