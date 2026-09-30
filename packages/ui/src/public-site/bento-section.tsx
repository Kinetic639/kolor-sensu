"use client";

// "Kolor Sensu w skrócie": the page's one modular section, a small bento
// of painted patches (not boxes: every tile is a wash cut by a brushed
// mask). Some tiles hold more than they show: "Więcej" opens the rest in
// place (progressive disclosure). Everything is in the server HTML; a
// closed tile only hides its extra paragraph.

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Plus } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { matches } from "./reveal-support";
import { EditorialHeading, SectionEyebrow } from "./typography";

gsap.registerPlugin(useGSAP);

export interface BentoItem {
  id: string;
  /** wide: two columns; tall: two rows; small: one cell. */
  size: "wide" | "tall" | "small";
  tone: "sage" | "blush" | "cream";
  icon: ReactNode;
  /** A big number or phrase above the title: "7 dni". */
  stat?: string;
  title?: string;
  description?: string;
  /** Shown after "Więcej". */
  more?: string;
  quote?: string;
  author?: string;
}

export interface BentoSectionProps {
  items: readonly BentoItem[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  id?: string;
  className?: string;
}

export function BentoSection({
  items,
  eyebrow = "Kolor Sensu w skrócie",
  heading = "Co warto wiedzieć, zanim przyjdziesz",
  id,
  className,
}: BentoSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "max-w-page px-gutter py-section mx-auto grid gap-10",
        className,
      )}
    >
      <div className="grid max-w-2xl gap-4">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <EditorialHeading>{heading}</EditorialHeading>
      </div>
      <ul className="ks-bento">
        {items.map((item) => (
          <li key={item.id} data-size={item.size} className="ks-bento__cell">
            <BentoTile item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const paintTone = {
  sage: "[--ks-paint-color:var(--color-primary-soft)]",
  blush: "[--ks-paint-color:var(--color-pink-soft)]",
  cream: "[--ks-paint-color:var(--color-cream)]",
} as const;

function BentoTile({ item }: { item: BentoItem }) {
  const [open, setOpen] = useState(false);
  const moreId = useId();
  const moreRef = useRef<HTMLDivElement>(null);

  // Opening unfolds the extra paragraph instead of popping it in.
  useGSAP(
    () => {
      const more = moreRef.current;
      if (!open || !more || matches("(prefers-reduced-motion: reduce)")) return;
      gsap.from(more, {
        height: 0,
        autoAlpha: 0,
        duration: 0.45,
        ease: "power2.out",
        clearProps: "height,opacity,visibility",
      });
    },
    { dependencies: [open] },
  );

  return (
    <article
      data-tone={item.tone}
      data-open={open || undefined}
      className="ks-bento__tile ks-lift group/tile"
    >
      <span
        aria-hidden="true"
        className={cn(
          "ks-paint inset-0",
          item.size === "tall" ? "ks-paint--tile" : "ks-paint--band",
          paintTone[item.tone],
        )}
      />
      <span aria-hidden="true" className="ks-bento__icon">
        {item.icon}
      </span>
      {item.quote ? (
        <figure className="grid gap-3">
          <blockquote className="font-display text-ink text-[1.25rem] leading-snug text-balance">
            „{item.quote}”
          </blockquote>
          {item.author ? (
            <figcaption className="text-small text-text-muted">
              {item.author}
            </figcaption>
          ) : null}
        </figure>
      ) : (
        <div className="grid gap-2">
          {item.stat ? (
            <p className="font-display text-display text-ink leading-none">
              {item.stat}
            </p>
          ) : null}
          {item.title ? (
            <h3 className="text-title text-ink text-balance">{item.title}</h3>
          ) : null}
          {item.description ? (
            <p className="text-small text-text-muted">{item.description}</p>
          ) : null}
        </div>
      )}
      {item.more ? (
        <>
          <div
            id={moreId}
            ref={moreRef}
            className="ks-bento__more"
            hidden={!open}
          >
            <p className="text-small text-ink/85">{item.more}</p>
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={moreId}
            onClick={() => setOpen((value) => !value)}
            className="ks-bento__toggle text-small text-ink focus-visible:outline-ring group/more mt-auto inline-flex items-center gap-2 self-start rounded-full font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className="bg-surface shadow-card grid size-8 place-items-center rounded-full">
              <Plus
                aria-hidden="true"
                className="ease-soft size-4 transition-transform duration-300 group-aria-expanded/more:rotate-45"
                strokeWidth={1.75}
              />
            </span>
            {open ? "Mniej" : "Więcej"}
          </button>
        </>
      ) : null}
    </article>
  );
}
