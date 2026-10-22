"use client";

// The areas of help ("Obszary wsparcia"), painted: a large watercolour
// blot in the middle (the photo cut by a brushed edge, on a wash of sage or
// pink that bleeds past it) and small drops of paint around it, each an
// area. Pointing at a drop, focusing it or tapping it lets its area bloom
// in the blot, as wet paint spreads: the photo, the area's name, a
// sentence and where it leads; the blot is that link. A thin pink thread,
// like the one in "Pierwszy krok", runs from the chosen drop to the blot.
// An area without a photo is a drop of plain paint, its name inside.
//
// Motion (support-areas-motion.ts, loaded with GSAP when the section comes
// near): the drops fall in one by one as the section is reached, then
// drift at two depths against the blot and its wash as the page scrolls,
// and lean a little after the mouse. Under reduced motion nothing moves:
// the section is the still composition the server sent.
//
// On phones the blot comes first and the drops follow in rows.
// The areas are the CMS's (Home → Obszary wsparcia); the section is code's.

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { PageLink } from "./page-link";
import { EditorialHeading, SectionEyebrow } from "./typography";
import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader } from "./section-header";
import { useLazyGsap } from "./lazy-gsap";
import { animateSupportAreas, drawThread } from "./support-areas-motion";

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
  /** The handwritten note by the blot, inviting a choice. */
  hint?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * Where the drops sit around the blot on wide screens, in percent of the
 * stage and rem, first to tenth; "far" ones drift more as the section
 * scrolls by. Left and right by turns, so any number of areas spreads
 * around. Each drop has its own blot (1–4) and lean, so no two look alike.
 */
export const SUPPORT_AREA_SLOTS = [
  { x: 77, y: 18, size: 9, depth: "near", blot: 1, tilt: -8 },
  { x: 22, y: 26, size: 10.5, depth: "far", blot: 2, tilt: 6 },
  { x: 86, y: 54, size: 7.5, depth: "far", blot: 3, tilt: 12 },
  { x: 14, y: 64, size: 8.5, depth: "near", blot: 4, tilt: -4 },
  { x: 71, y: 86, size: 10, depth: "near", blot: 2, tilt: -10 },
  { x: 31, y: 88, size: 7.5, depth: "far", blot: 1, tilt: 8 },
  { x: 93, y: 27, size: 6, depth: "near", blot: 4, tilt: 4 },
  { x: 7, y: 37, size: 6.5, depth: "far", blot: 3, tilt: -12 },
  { x: 93, y: 80, size: 6, depth: "far", blot: 1, tilt: 10 },
  { x: 9, y: 88, size: 5.5, depth: "near", blot: 2, tilt: -6 },
] as const;

/** Sage and pink by turns, as the offer's tiles. */
export function areaPaint(index: number) {
  return index % 2 === 0 ? "sage" : "pink";
}

const DEFAULT_HINT = "Każda kropla to inna historia. Wybierz swoją";

export function SupportAreas({
  header,
  eyebrow,
  heading,
  description,
  areas,
  cta,
  hint = DEFAULT_HINT,
  id,
  className,
}: SupportAreasProps) {
  const headingId = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  // The area shown before, kept under the new one while it blooms in.
  const [previous, setPrevious] = useState<number | null>(null);
  const choose = (index: number) => {
    if (index === selected) return;
    setPrevious(selected);
    setSelected(index);
  };

  useLazyGsap((kit) => animateSupportAreas(kit, stage.current), {
    scope: stage,
  });

  // The thread follows the chosen drop (and the drops, as they drift).
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    drawThread(root, true);
    const redraw = () => drawThread(root, false);
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [selected]);

  const area = areas[selected] ?? areas[0];
  if (!area) return null;
  const count = String(areas.length).padStart(2, "0");

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

        <div
          ref={stage}
          className="ks-areas__stage"
          data-paint={areaPaint(selected)}
        >
          <div className="ks-areas__heart">
            <span className="ks-areas__wash" aria-hidden="true">
              <span className="ks-areas__wash-layer" data-paint="sage" />
              <span className="ks-areas__wash-layer" data-paint="pink" />
            </span>

            <PageLink href={area.href} className="ks-areas__center">
              <span className="ks-areas__pictures">
                {areas.map((one, index) => {
                  const shown = index === selected;
                  const state = shown
                    ? "shown"
                    : index === previous
                      ? "previous"
                      : undefined;
                  return one.image ? (
                    <Image
                      key={one.id}
                      src={one.image.src}
                      alt={shown ? one.image.alt : ""}
                      aria-hidden={shown ? undefined : true}
                      data-state={state}
                      className="ks-areas__picture"
                      fill
                      sizes="(min-width: 64rem) 34rem, 90vw"
                    />
                  ) : (
                    <span
                      key={one.id}
                      aria-hidden="true"
                      data-state={state}
                      className="ks-areas__picture ks-areas__paint"
                      data-paint={areaPaint(index)}
                    />
                  );
                })}
              </span>
              <span
                key={area.id}
                className="ks-areas__text"
                data-on-photo={area.image ? true : undefined}
              >
                <span className="ks-areas__count font-display" aria-hidden>
                  <span className="ks-areas__count-now">
                    {String(selected + 1).padStart(2, "0")}
                  </span>{" "}
                  / {count}
                </span>
                <span className="ks-areas__title font-display">
                  {area.title}
                </span>
                <span className="ks-areas__lead">{area.lead}</span>
                <span className="ks-areas__more">
                  {area.linkLabel}
                  <ArrowRight
                    aria-hidden="true"
                    className="ks-areas__arrow size-4"
                  />
                </span>
              </span>
            </PageLink>

            {hint ? (
              <p className="ks-areas__hint" aria-hidden="true">
                <span>{hint}</span>
                <svg viewBox="0 0 60 40" className="ks-areas__hint-arrow">
                  <path d="M54 36C40 34 20 26 9 9" />
                  <path d="M8 19L9 9l10 3" />
                </svg>
              </p>
            ) : null}
          </div>

          <svg className="ks-areas__thread" aria-hidden="true">
            <path className="ks-areas__thread-line" />
            <circle className="ks-areas__thread-dot" r="4" />
          </svg>

          <ul className="ks-areas__orbit">
            {areas.map((one, index) => {
              const slot =
                SUPPORT_AREA_SLOTS[index % SUPPORT_AREA_SLOTS.length]!;
              const paint = areaPaint(index);
              return (
                <li
                  key={one.id}
                  className="ks-areas__item"
                  data-depth={slot.depth}
                  style={
                    {
                      "--ks-area-x": `${slot.x}%`,
                      "--ks-area-y": `${slot.y}%`,
                      "--ks-area-size": `${slot.size}rem`,
                      "--ks-area-tilt": `${slot.tilt}deg`,
                      "--ks-area-blot": `url("/watercolor/areas-blot-${slot.blot}.png")`,
                      "--ks-area-drop": `url("/watercolor/areas-drop-${paint}-${slot.blot}.webp")`,
                      "--ks-area-rim": `url("/watercolor/areas-rim-${paint}-${slot.blot}.webp")`,
                    } as CSSProperties
                  }
                >
                  <span className="ks-areas__float">
                    <button
                      type="button"
                      aria-label={one.title}
                      aria-pressed={index === selected}
                      className="ks-areas__dot"
                      data-paint={paint}
                      data-photo={one.image ? true : undefined}
                      onPointerEnter={() => choose(index)}
                      onFocus={() => choose(index)}
                      onClick={() => choose(index)}
                    >
                      <span className="ks-areas__drop">
                        {one.image ? (
                          <Image
                            src={one.image.src}
                            alt=""
                            fill
                            sizes="11rem"
                            className="ks-areas__dot-picture"
                          />
                        ) : (
                          <span className="ks-areas__dot-label font-display">
                            {one.title}
                          </span>
                        )}
                        <span className="ks-areas__rim" />
                      </span>
                      {one.image ? (
                        <span
                          className="ks-areas__name font-display"
                          aria-hidden="true"
                        >
                          {one.title}
                        </span>
                      ) : null}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {cta ? (
          <ArrowLink href={cta.href} className="justify-self-center">
            {cta.label}
          </ArrowLink>
        ) : null}
      </div>
    </section>
  );
}
