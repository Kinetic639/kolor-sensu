import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// The day in a few figures, in one strip under the header (the dashboard,
// docs/product/booking-plan.md R14): each leads to its bookings, filtered.
// On a phone the strip scrolls sideways instead of wrapping.

export interface DayStripItem {
  id: string;
  label: string;
  /** `8`, `240 zł` */
  value: string;
  /** Beside the value, smaller: `wizyt`, `do 13:00`. */
  detail?: string;
  /** Something to deal with: the value in its colour. */
  tone?: "warning" | "danger";
  href: string;
}

const TONE = {
  warning: "text-[var(--warning-foreground)]",
  danger: "text-[var(--danger)]",
};

export function DayStrip({ items }: { items: DayStripItem[] }) {
  return (
    <nav
      aria-label="Dzień w liczbach"
      className="flex snap-x overflow-x-auto border-b border-[var(--border)] [scrollbar-width:none]"
    >
      {items.map((item) => (
        <Link
          className="grid min-h-[52px] min-w-[8.5rem] shrink-0 snap-start content-center gap-px border-r border-[var(--border)] px-4 py-2 last:border-r-0 hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--surface-subtle)] focus-visible:outline-none md:min-w-0 md:flex-1 lg:flex-none lg:pr-8"
          href={item.href}
          key={item.id}
        >
          <span className="text-[0.72rem] text-[var(--text-muted)]">
            {item.label}
          </span>
          <span
            className={cn(
              "flex items-baseline gap-1.5 text-[1.0625rem] leading-tight font-semibold tabular-nums",
              item.tone && TONE[item.tone],
            )}
          >
            {item.value}
            {item.detail ? (
              <small className="text-[0.72rem] font-normal whitespace-nowrap text-[var(--text-muted)]">
                {item.detail}
              </small>
            ) : null}
          </span>
        </Link>
      ))}
    </nav>
  );
}
