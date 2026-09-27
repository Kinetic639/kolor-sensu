import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { ArrowLink } from "./actions";
import {
  type OfferService,
  OfferTile,
  type OfferTileProps,
} from "./offer-tile";
import { EditorialHeading, SectionEyebrow } from "./typography";

export interface OfferSectionProps {
  services: readonly OfferService[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  cta?: { href: string; label: ReactNode };
  animationPreset?: OfferTileProps["animationPreset"];
  reducedMotionMode?: OfferTileProps["reducedMotionMode"];
  id?: string;
  className?: string;
}

// A row of tiles entering together: each starts a little after the one
// before; odd tiles are painted top to bottom, even ones bottom to top.
const STAGGER = 0.1;

/**
 * "Nasza oferta" (reference A, service tiles): intro on the left, four
 * watercolor tiles in a row on wide screens; intro first, then a 2 x 2 grid
 * on phones. Data-driven: pass any number of services.
 */
export function OfferSection({
  services,
  eyebrow = "Nasza oferta",
  heading = "Wsparcie w różnych obszarach życia",
  description,
  cta,
  animationPreset = "none",
  reducedMotionMode,
  id,
  className,
}: OfferSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "max-w-page px-gutter py-section-sm mx-auto grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-center lg:gap-10",
        className,
      )}
    >
      <div className="grid content-start gap-4">
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
      <ul className="ks-of-list">
        {services.map((service, index) => (
          <li key={service.href}>
            <OfferTile
              {...service}
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
