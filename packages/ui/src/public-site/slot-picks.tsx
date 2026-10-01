import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { PageLink as Link } from "./page-link";
import { EditorialHeading, SectionEyebrow } from "./typography";

// "Najbliższe wolne terminy": a few real free times, each on its own patch
// of paint, every one a link straight to that time in the booking wizard.
// The day is written by hand above the hour, the way one notes a visit in a
// diary. Server-only; the app hides the section when nothing is free.

export interface SlotPick {
  href: string;
  /** "Wtorek" */
  weekday: string;
  /** "7 października" */
  date: string;
  /** "10:00" */
  time: string;
  specialist: string;
  service: string;
  /** "w gabinecie" / "online" */
  mode: string;
}

export interface SlotPicksProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  slots: readonly SlotPick[];
  cta?: { href: string; label: ReactNode };
  className?: string;
}

const PAINTS = ["sage-1", "pink-1", "sage-2", "pink-2"] as const;
const TILTS = [-2, 1.5, -1, 2];

export function SlotPicks({
  eyebrow,
  heading,
  description,
  slots,
  cta,
  className,
}: SlotPicksProps) {
  return (
    <section
      className={cn(
        "ks-slots max-w-page px-gutter py-section mx-auto grid gap-10",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="grid max-w-[38rem] gap-3" data-motion="text">
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <EditorialHeading>{heading}</EditorialHeading>
          {description ? (
            <p className="text-body text-text-muted">{description}</p>
          ) : null}
        </div>
        {cta ? <ArrowLink href={cta.href}>{cta.label}</ArrowLink> : null}
      </div>
      <ul
        className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
        data-motion="text"
      >
        {slots.map((slot, index) => (
          <li key={slot.href}>
            <Link
              href={slot.href}
              className="ks-slots__pick"
              style={{ rotate: `${TILTS[index % TILTS.length]}deg` }}
            >
              <span aria-hidden="true" className="ks-slots__paint">
                <Image
                  src={`/watercolor/offer-${PAINTS[index % PAINTS.length]}.png`}
                  alt=""
                  fill
                  sizes="(min-width: 64rem) 24rem, (min-width: 40rem) 60vw, 100vw"
                  loading="lazy"
                />
              </span>
              <span className="ks-slots__day font-hand text-pink-strong">
                {slot.weekday}
              </span>
              <span className="font-display text-ink text-[clamp(2.75rem,5vw,3.5rem)] leading-none">
                {slot.time}
              </span>
              <span className="text-small text-ink/80">{slot.date}</span>
              <span className="text-small text-ink mt-2 font-semibold">
                {slot.specialist}
              </span>
              <span className="text-small text-ink/75">{slot.service}</span>
              <span className="text-small text-ink/75">{slot.mode}</span>
              <span className="ks-slots__go text-small text-ink mt-2 font-semibold">
                Zarezerwuj ten termin
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
