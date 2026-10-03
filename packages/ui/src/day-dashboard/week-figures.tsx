import type { WeekFigure } from "@repo/scheduling";
import { cn } from "../lib/utils";

// This week in a few figures, against the week before (the dashboard, R14):
// the change in green when it is good news, red when not.

const TREND = {
  up: "text-[var(--success)]",
  down: "text-[var(--danger)]",
  flat: "text-[var(--text-muted)]",
};

export function WeekFigures({ figures }: { figures: WeekFigure[] }) {
  return (
    <div className="grid grid-cols-3">
      {figures.map((figure) => (
        <div
          className="grid gap-px border-r border-b border-[var(--border)] px-3.5 py-2.5 last:border-r-0"
          key={figure.id}
        >
          <span className="text-[0.72rem] text-[var(--text-muted)]">
            {figure.label}
          </span>
          <span className="flex items-baseline gap-1.5 text-[1.0625rem] leading-tight font-semibold tabular-nums">
            {figure.value}
            {figure.change ? (
              <small
                className={cn(
                  "text-[0.72rem] font-medium",
                  TREND[figure.trend],
                )}
              >
                {figure.change}
              </small>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
