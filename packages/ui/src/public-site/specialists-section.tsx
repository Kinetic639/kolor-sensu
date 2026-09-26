import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import { BotanicalAccent } from "./botanical-accent";
import {
  type Specialist,
  SpecialistWatercolorCard,
  type SpecialistWatercolorCardProps,
} from "./specialist-card";
import { EditorialHeading, SectionEyebrow } from "./typography";

export interface SpecialistsSectionProps {
  specialists: readonly Specialist[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  cta?: { href: string; label: ReactNode };
  animationPreset?: SpecialistWatercolorCardProps["animationPreset"];
  reducedMotionMode?: SpecialistWatercolorCardProps["reducedMotionMode"];
  id?: string;
  className?: string;
}

// Row of cards entering together: each starts a little after the one
// before, and every other one blooms mirrored.
const STAGGER = 0.12;

/**
 * "Nasi specjaliści" (reference: specialists-concept.png). Intro on the
 * left, three specialist cards in a row on wide screens; stacked, heading
 * first, on phones. Data-driven: pass any number of specialists.
 */
export function SpecialistsSection({
  specialists,
  eyebrow = "Nasi specjaliści",
  heading = "Poznaj nasz zespół",
  description,
  cta,
  animationPreset = "none",
  reducedMotionMode,
  id,
  className,
}: SpecialistsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "max-w-page px-gutter py-section-sm relative isolate mx-auto grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,8fr)] lg:items-center lg:gap-8",
        className,
      )}
    >
      <div className="grid content-start gap-4 lg:pb-24">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <EditorialHeading>{heading}</EditorialHeading>
        {description ? (
          <p className="max-w-copy text-body text-text-muted">{description}</p>
        ) : null}
        {cta ? (
          <ArrowLink href={cta.href} className="mt-2 justify-self-start">
            {cta.label}
          </ArrowLink>
        ) : null}
      </div>
      <ul className="ks-sp-list">
        {specialists.map((specialist, index) => (
          <li key={specialist.href}>
            <SpecialistWatercolorCard
              {...specialist}
              as="div"
              animationPreset={animationPreset}
              reducedMotionMode={reducedMotionMode}
              matte={index % 2 ? "b" : "a"}
              revealDelay={index * STAGGER}
            />
          </li>
        ))}
      </ul>
      <BotanicalAccent
        variant="leaf"
        className="text-primary/30 pointer-events-none absolute bottom-4 left-[calc(var(--spacing-gutter)-1.5rem)] -z-10 hidden w-24 lg:block"
      />
    </section>
  );
}
