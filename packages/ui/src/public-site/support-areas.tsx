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
import { type CSSProperties, type ReactNode, useId, useState } from "react";
import { cn } from "../lib/utils";
import { HanddrawnLink } from "./handdrawn-link";
import { PageLink } from "./page-link";
import { EditorialHeading, SectionEyebrow } from "./typography";
import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader } from "./section-header";

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
  { x: 23, y: 30, size: 9.5, depth: "far" },
  { x: 84, y: 56, size: 6.5, depth: "far" },
  { x: 15, y: 64, size: 7.5, depth: "near" },
  { x: 72, y: 86, size: 9, depth: "near" },
  { x: 30, y: 88, size: 6.5, depth: "far" },
  { x: 92, y: 30, size: 5.5, depth: "near" },
  { x: 8, y: 36, size: 6, depth: "far" },
  { x: 92, y: 80, size: 5.5, depth: "far" },
  { x: 10, y: 88, size: 5, depth: "near" },
] as const;

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
  const [selected, setSelected] = useState(0);
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

        <div className="ks-areas__stage">
          <PageLink href={area.href} className="ks-areas__center">
            <span className="ks-areas__pictures">
              {areas.map((one, index) => {
                const shown = index === selected;
                return one.image ? (
                  <Image
                    key={one.id}
                    src={one.image.src}
                    alt={shown ? one.image.alt : ""}
                    aria-hidden={shown ? undefined : true}
                    data-shown={shown || undefined}
                    className="ks-areas__picture"
                    fill
                    sizes="(min-width: 64rem) 32rem, 90vw"
                  />
                ) : (
                  <span
                    key={one.id}
                    aria-hidden="true"
                    data-shown={shown || undefined}
                    className="ks-areas__picture ks-areas__paint"
                    data-paint={index % 2 === 0 ? "sage" : "blush"}
                  />
                );
              })}
            </span>
            <span className="ks-areas__ring" aria-hidden="true" />
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

          <ul className="ks-areas__orbit">
            {areas.map((one, index) => {
              const slot =
                SUPPORT_AREA_SLOTS[index % SUPPORT_AREA_SLOTS.length]!;
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
                      <Image
                        src={one.image.src}
                        alt=""
                        fill
                        sizes="10rem"
                        className="ks-areas__dot-picture"
                      />
                    ) : (
                      <span
                        className="ks-areas__paint ks-areas__dot-paint"
                        data-paint={index % 2 === 0 ? "sage" : "blush"}
                      >
                        <span className="ks-areas__dot-label">{one.title}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {cta ? (
          <HanddrawnLink href={cta.href} className="justify-self-center">
            {cta.label}
          </HanddrawnLink>
        ) : null}
      </div>
    </section>
  );
}
