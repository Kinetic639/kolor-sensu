import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// A roster's bars: the list's (the search, which ones as a segmented
// choice with counts, the order, the main action) and the week's (where in
// time the figures are, the whole in numbers). Links all, rendered on the
// server.

export interface RosterSegment {
  key: string;
  label: string;
  count: number;
  href: string;
  active: boolean;
}

export function RosterBar({
  search,
  segments,
  sort,
  action,
  label,
}: {
  search: ReactNode;
  segments: RosterSegment[];
  sort?: ReactNode;
  action?: ReactNode;
  /** The segments' name, e.g. `Którzy specjaliści`. */
  label: string;
}) {
  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 sm:px-3">
      {search}
      <nav
        aria-label={label}
        className="order-last w-full sm:order-none sm:w-auto"
      >
        <ul className="flex w-max max-w-full items-center gap-0.5 overflow-x-auto rounded-[6px] border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5 text-[0.75rem]">
          {segments.map((segment) => (
            <li key={segment.key}>
              <Link
                aria-current={segment.active ? "page" : undefined}
                className={cn(
                  "flex h-[22px] items-center gap-1.5 rounded-[4px] px-2.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                  segment.active
                    ? "bg-[var(--surface)] font-semibold text-[var(--text)] shadow-[0_1px_2px_rgb(16_32_28/0.12)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                )}
                href={segment.href}
                scroll={false}
              >
                {segment.label}
                <span className="text-[0.65625rem] text-[var(--text-subtle)] tabular-nums">
                  {segment.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {sort}
        {action}
      </div>
    </div>
  );
}

const STEP =
  "inline-grid size-6 place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

/** `‹ 5–11 października ›  · dziś czwartek`, the whole on the right. */
export function RosterWeek({
  label,
  previousHref,
  nextHref,
  currentHref,
  summary,
}: {
  label: string;
  previousHref: string;
  nextHref: string;
  /** Back to this week (null: this week is shown). */
  currentHref: string | null;
  summary?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5 text-[0.75rem] text-[var(--text-muted)]">
      <nav aria-label="Tydzień" className="flex items-center gap-1">
        <Link
          aria-label="Poprzedni tydzień"
          className={STEP}
          href={previousHref}
          scroll={false}
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
        </Link>
        <span
          aria-live="polite"
          className="font-semibold text-[var(--text)] tabular-nums"
        >
          {label}
        </span>
        <Link
          aria-label="Następny tydzień"
          className={STEP}
          href={nextHref}
          scroll={false}
        >
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
        {currentHref ? (
          <Link
            className="ml-1 rounded-[4px] px-1.5 font-medium text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={currentHref}
            scroll={false}
          >
            Ten tydzień
          </Link>
        ) : null}
      </nav>
      {summary ? <span className="ml-auto tabular-nums">{summary}</span> : null}
    </div>
  );
}

/** The rows, one under another, on a light ground. */
export function Roster({
  week,
  children,
  label,
}: {
  week?: ReactNode;
  children: ReactNode;
  label: string;
}) {
  return (
    <section
      aria-label={label}
      className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto bg-[var(--surface-subtle)] p-2 sm:p-3"
    >
      {week}
      {children}
    </section>
  );
}

/** What a roster says when nothing matches. */
export function RosterEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center text-[0.8125rem] text-[var(--text-muted)]">
      {children}
    </p>
  );
}
