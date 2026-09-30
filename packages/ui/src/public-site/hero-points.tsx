import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface HeroPoint {
  /** A line icon (lucide); decorative, the label says it all. */
  icon: ReactNode;
  label: string;
  /** Icon colour: brand green (default) or dusty pink. */
  tone?: "primary" | "pink";
}

const tones = {
  primary: "text-primary",
  pink: "text-pink",
} as const;

export interface HeroPointsProps {
  points: readonly HeroPoint[];
  className?: string;
}

/**
 * The row of reassurances under the hero's actions (reference A: "Doświadczeni
 * specjaliści", "Indywidualne podejście", …): a thin line icon above a short
 * label. Two columns on phones, one row from 40 rem.
 */
export function HeroPoints({ points, className }: HeroPointsProps) {
  return (
    <ul className={cn("grid grid-cols-2 gap-6 sm:grid-cols-4", className)}>
      {points.map(({ icon, label, tone = "primary" }) => (
        <li
          key={label}
          data-hero-point
          className="text-small grid content-start gap-2"
        >
          <span
            aria-hidden="true"
            className={cn("[&_svg]:size-7 [&_svg]:stroke-[1.25]", tones[tone])}
          >
            {icon}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
