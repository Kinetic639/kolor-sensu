import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { useId } from "react";
import { cn } from "../lib/utils";
import { OfferTile } from "./offer-tile";
import { SectionHeader } from "./section-header";
import { offerPaintAt } from "./service-look";

// Server-safe: "Dlaczego my", under the areas of help. The header and the
// two to four facts are the CMS's (title and one sentence each); the
// markup is this section's: a list, each fact a watercolor tile (the offer
// tiles' patches and brush reveal, without a link or an arrow) with its
// title as an h3 under the section's h2.
//
//   section   aria-labelledby → the header's title
//   ├── header  eyebrow, h2 title, description (SectionHeader)
//   └── ul      one OfferTile per fact: h3 title, sentence
//
// The layout is the offer section's: header on the left and the tiles in a
// row on wide screens; header first, then two by two on phones.

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

// A row of tiles entering together: each starts a little after the one
// before; odd tiles are painted top to bottom, even ones bottom to top.
const STAGGER = 0.1;

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
        "max-w-page px-gutter py-section-sm mx-auto grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-center",
        className,
      )}
      id={id}
    >
      <SectionHeader content={header} id={headingId} size="h2" />
      <ul className="ks-of-list">
        {facts.map((fact, index) => (
          <li key={fact.title}>
            <OfferTile
              title={fact.title}
              description={fact.text}
              paint={offerPaintAt(index)}
              as="div"
              headingLevel="h3"
              animationPreset="brush-reveal"
              matte={index % 2 ? "b" : "a"}
              revealDelay={index * STAGGER}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
