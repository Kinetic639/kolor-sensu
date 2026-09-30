import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ElementType } from "react";
import { Button } from "./button";
import { cn } from "./lib/utils";

// "‹ 28 września – 4 października 2026 ›": the shown period and links to
// its neighbours (the state lives in the URL, so it works without
// JavaScript). "Dziś" goes back to the current one.

export interface PeriodNavProps {
  label: string;
  /** The full period, when the label is shortened. */
  title?: string;
  previousHref: string;
  nextHref: string;
  /** Null: the current period is shown. */
  todayHref?: string | null;
  unit?: "tydzień" | "dzień";
  /** The link component, e.g. next/link (defaults to `a`). */
  linkAs?: ElementType;
  className?: string;
}

export function PeriodNav({
  label,
  title,
  previousHref,
  nextHref,
  todayHref,
  unit = "tydzień",
  linkAs: Link = "a",
  className,
}: PeriodNavProps) {
  const previous = unit === "tydzień" ? "Poprzedni tydzień" : "Poprzedni dzień";
  const next = unit === "tydzień" ? "Następny tydzień" : "Następny dzień";
  return (
    <nav
      aria-label={unit === "tydzień" ? "Tydzień" : "Dzień"}
      className={cn("flex items-center gap-2", className)}
    >
      <div className="flex items-center gap-1 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1">
        <Button asChild size="icon" variant="ghost">
          <Link aria-label={previous} href={previousHref}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <p
          aria-live="polite"
          className="min-w-44 text-center text-sm font-semibold whitespace-nowrap text-[var(--text)] first-letter:uppercase"
          title={title}
        >
          {label}
        </p>
        <Button asChild size="icon" variant="ghost">
          <Link aria-label={next} href={nextHref}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
      {todayHref ? (
        <Button asChild size="sm" variant="secondary">
          <Link href={todayHref}>Dziś</Link>
        </Button>
      ) : null}
    </nav>
  );
}
