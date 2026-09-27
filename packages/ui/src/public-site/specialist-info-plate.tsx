import { ArrowRight } from "lucide-react";
import { PageLink as Link } from "./page-link";
import { cn } from "../lib/utils";
import type { SpecialistAccent } from "./specialist-artwork";

const arrowTones = {
  pink: "bg-pink-soft text-pink-strong",
  sage: "bg-primary-soft text-primary-strong",
} as const;

export interface SpecialistInfoPlateProps {
  name: string;
  role: string;
  href: string;
  accent: SpecialistAccent;
  headingLevel?: "h2" | "h3" | "h4";
}

/**
 * The one conventional UI element of a specialist card: a small rounded
 * plaque with the name, the role and an arrow, overlapping the artwork. The
 * name is the card's link; its overlay covers the whole card (the card root
 * is the positioned ancestor), so the portrait is clickable too.
 */
export function SpecialistInfoPlate({
  name,
  role,
  href,
  accent,
  headingLevel: Heading = "h3",
}: SpecialistInfoPlateProps) {
  return (
    <div
      className={cn(
        "ks-sp__plate rounded-card-lg border-border/70 bg-surface shadow-card flex items-center justify-between gap-3 border",
        "ease-soft group-hover/sp:shadow-card-hover transition-shadow duration-300",
        "group-has-[a:focus-visible]/sp:outline-ring group-has-[a:focus-visible]/sp:outline-2 group-has-[a:focus-visible]/sp:outline-offset-3",
      )}
    >
      <div className="min-w-0">
        <Heading className="ks-sp__name font-display text-ink text-balance">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none"
          >
            {name}
          </Link>
        </Heading>
        <p className="text-small text-text-muted mt-0.5">{role}</p>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "ks-sp__arrow rounded-button grid shrink-0 place-items-center",
          arrowTones[accent],
        )}
      >
        <ArrowRight
          className="ease-soft size-4 transition-transform duration-200 group-hover/sp:translate-x-0.5"
          strokeWidth={1.75}
        />
      </span>
    </div>
  );
}
