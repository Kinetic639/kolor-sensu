import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { useId } from "react";
import { cn } from "../lib/utils";
import { SectionHeader } from "./section-header";
import { SoftCard } from "./surfaces";

// Server-safe: "Dlaczego my", under the areas of help. The header and the
// two to four facts are the CMS's (title and one sentence each); the
// markup is this section's: a list, each fact a card with its title as an
// h3 under the section's h2.
//
//   section   aria-labelledby → the header's title
//   ├── header  eyebrow, h2 title, description (SectionHeader)
//   └── ul      one card per fact: h3 title, sentence

export interface WhyUsFact {
  title: string;
  text: string;
}

export interface WhyUsSectionProps {
  header: SectionHeaderContent;
  facts: readonly WhyUsFact[];
  id?: string;
  className?: string;
}

export function WhyUsSection({
  header,
  facts,
  id,
  className,
}: WhyUsSectionProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "max-w-page px-gutter py-section-sm mx-auto grid gap-10",
        className,
      )}
      id={id}
    >
      <SectionHeader content={header} id={headingId} size="h2" />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <li key={fact.title}>
            <SoftCard className="grid h-full content-start gap-2 p-6">
              <h3 className="font-display text-h3 text-ink">{fact.title}</h3>
              <p className="text-body text-text-muted">{fact.text}</p>
            </SoftCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
