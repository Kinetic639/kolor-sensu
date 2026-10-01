import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { SectionEyebrow } from "./typography";

// Server-safe. One calm statement set inside a hairline circle (after
// Talking Walls' "concept" ring): eyebrow, a sentence in the display face,
// an optional link. Inside a PageMotion the ring draws itself and turns a
// few degrees as the section crosses the screen, and the words come in like
// any text column (public-site.css, "Circle statement"); elsewhere, or
// without scroll-driven animations, the ring is simply drawn.

export interface CircleStatementProps {
  eyebrow?: ReactNode;
  statement: ReactNode;
  cta?: { href: string; label: ReactNode };
  id?: string;
  className?: string;
}

export function CircleStatement({
  eyebrow,
  statement,
  cta,
  id,
  className,
}: CircleStatementProps) {
  return (
    <section
      id={id}
      className={cn(
        "ks-circle max-w-page px-gutter py-section-sm mx-auto grid place-items-center",
        className,
      )}
    >
      <div className="ks-circle__frame grid place-items-center">
        <svg
          className="ks-circle__ring"
          viewBox="0 0 100 100"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="50" cy="50" r="49.6" pathLength={1} />
          <circle cx="50" cy="50" r="47.8" pathLength={1} />
        </svg>
        <div
          className="grid max-w-[30rem] justify-items-center gap-5 text-center"
          data-motion="text"
        >
          {eyebrow ? (
            <SectionEyebrow className="text-pink-strong">
              {eyebrow}
            </SectionEyebrow>
          ) : null}
          <p className="font-display text-ink text-h3 text-balance">
            {statement}
          </p>
          {cta ? <ArrowLink href={cta.href}>{cta.label}</ArrowLink> : null}
        </div>
      </div>
    </section>
  );
}
