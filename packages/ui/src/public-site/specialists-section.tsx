import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import {
  type Specialist,
  SpecialistWatercolorCard,
  type SpecialistWatercolorCardProps,
} from "./specialist-card";
import { EditorialHeading, SectionEyebrow } from "./typography";
import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader } from "./section-header";

export interface SpecialistsSectionProps {
  specialists: readonly Specialist[];
  /**
   * The header as the CMS edits it (words and colours; the markup stays
   * this section's). When given, it replaces eyebrow, heading,
   * description and cta (its own call to action takes cta's place).
   */
  header?: SectionHeaderContent;
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
  header,
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
        "max-w-page px-gutter py-section-sm mx-auto grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,8fr)] lg:items-center lg:gap-8",
        className,
      )}
    >
      {header ? (
        <SectionHeader content={header} className="gap-4" />
      ) : (
        <div className="grid content-start gap-4">
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <EditorialHeading>{heading}</EditorialHeading>
          {description ? (
            <p className="max-w-copy text-body text-text-muted">
              {description}
            </p>
          ) : null}
          {cta ? (
            <ArrowLink href={cta.href} className="mt-2 justify-self-start">
              {cta.label}
            </ArrowLink>
          ) : null}
        </div>
      )}
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
    </section>
  );
}
