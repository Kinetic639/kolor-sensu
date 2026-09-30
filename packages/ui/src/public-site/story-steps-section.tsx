import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { EditorialHeading, SectionEyebrow } from "./typography";

// Server-safe on purpose: no hooks, no browser APIs. "Jak zaczynamy": a
// short story told in stages. The intro stays in view (sticky) while the
// steps pass beside it; the gap between them is where the scroll story's
// watercolor path runs (ScrollStory), and each step is a station: when the
// path's paint front reaches it, it gets its colour and its number is
// circled with a brush. Without a script, or outside a ScrollStory, every
// step is simply shown.

export interface StoryStep {
  title: string;
  description: ReactNode;
}

export interface StoryStepsSectionProps {
  steps: readonly StoryStep[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  cta?: { href: string; label: ReactNode };
  id?: string;
  className?: string;
}

export function StoryStepsSection({
  steps,
  eyebrow = "Jak zaczynamy",
  heading = "Pierwszy krok",
  accent = "nie musi być duży",
  description = "Nie musisz wiedzieć, jak nazwać to, z czym przychodzisz. Wystarczy, że zaczniemy rozmawiać.",
  cta,
  id,
  className,
}: StoryStepsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "max-w-page px-gutter py-section mx-auto grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,1.6fr)_minmax(0,6fr)] lg:gap-0",
        className,
      )}
    >
      <div className="grid content-start gap-4 lg:sticky lg:top-32 lg:self-start">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <EditorialHeading accent={accent}>{heading}</EditorialHeading>
        {description ? (
          <p className="max-w-copy text-lead text-text-muted">{description}</p>
        ) : null}
        {cta ? (
          <ArrowLink href={cta.href} className="mt-2 justify-self-start">
            {cta.label}
          </ArrowLink>
        ) : null}
      </div>
      <ol className="ks-steps lg:col-start-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="ks-step"
            data-story-station
            data-tone={index % 2 ? "sage" : "blush"}
          >
            <span className="ks-step__number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
              <svg
                className="ks-step__ring"
                viewBox="0 0 100 80"
                focusable="false"
              >
                <path
                  pathLength={1}
                  d="M60 8C36 4 9 14 6 37c-3 22 20 37 46 36 27-1 44-16 42-35C92 19 74 8 50 9 38 10 27 14 20 19"
                />
              </svg>
            </span>
            <div className="grid gap-2">
              <h3 className="font-display text-h3 text-ink">{step.title}</h3>
              <p className="text-body text-text-muted max-w-copy">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
