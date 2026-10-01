import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { EditorialHeading, SectionEyebrow } from "./typography";

// "Ile to kosztuje": the prices written out like a short menu, each service
// on its own line with a dotted leader to the price, beside a few words on
// the two ways to meet (in the room or online). Server-only.

export interface PriceNote {
  service: string;
  /** "50 min · w gabinecie lub online" */
  details: string;
  /** "od 200 zł" */
  price: string;
}

export interface PriceNotesProps {
  eyebrow?: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  forms?: readonly { title: string; text: ReactNode }[];
  prices: readonly PriceNote[];
  cta?: { href: string; label: ReactNode };
  className?: string;
}

export function PriceNotes({
  eyebrow,
  heading,
  description,
  forms,
  prices,
  cta,
  className,
}: PriceNotesProps) {
  return (
    <section
      className={cn(
        "max-w-page px-gutter py-section-sm mx-auto grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16",
        className,
      )}
    >
      <div className="grid content-start gap-4" data-motion="text">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <EditorialHeading>{heading}</EditorialHeading>
        {description ? (
          <p className="text-body text-text-muted max-w-copy">{description}</p>
        ) : null}
        {forms?.map((form) => (
          <div key={form.title} className="ks-price__form grid gap-1">
            <p className="font-hand text-pink-strong text-[1.6rem] leading-tight">
              {form.title}
            </p>
            <p className="text-small text-text-muted max-w-copy">{form.text}</p>
          </div>
        ))}
      </div>
      <div className="grid content-start gap-6" data-motion="text">
        <ul className="grid">
          {prices.map((row) => (
            <li key={row.service} className="ks-price__row">
              <span className="grid gap-0.5">
                <span className="font-display text-ink text-[1.35rem] leading-snug">
                  {row.service}
                </span>
                <span className="text-small text-text-muted">
                  {row.details}
                </span>
              </span>
              <span aria-hidden="true" className="ks-price__leader" />
              <span className="font-display text-ink text-[1.35rem] whitespace-nowrap">
                {row.price}
              </span>
            </li>
          ))}
        </ul>
        {cta ? (
          <ArrowLink href={cta.href} className="justify-self-start">
            {cta.label}
          </ArrowLink>
        ) : null}
      </div>
    </section>
  );
}
