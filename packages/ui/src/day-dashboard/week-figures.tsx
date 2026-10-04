import type { ServiceDay, WeekFigure } from "@repo/scheduling";
import { cn } from "../lib/utils";

// This week in a few figures, against the week before (the dashboard, R14):
// the change in green when it is good news, red when not. Beside them the
// week's visits day by day, in bars as on the offer's list (today full).

function visitsLabel(count: number) {
  if (count === 1) return "1 wizyta";
  const last = count % 10;
  const lastTwo = count % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? `${count} wizyty`
    : `${count} wizyt`;
}

function WeekBars({ days }: { days: ServiceDay[] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <div className="grid content-end gap-1 px-3.5 py-2.5">
      <div
        aria-label={`Wizyty w dniach tygodnia: ${days.map((day) => `${day.weekday} ${day.count}`).join(", ")}`}
        className="grid h-12 grid-cols-7 items-end gap-1.5"
        role="img"
      >
        {days.map((day) => (
          <span
            aria-hidden="true"
            className="grid h-full grid-rows-[auto_minmax(0,1fr)] items-end justify-items-center"
            key={day.date}
            title={`${day.weekday}: ${visitsLabel(day.count)}`}
          >
            <span className="text-[0.65625rem] leading-3 text-[var(--text-muted)] tabular-nums">
              {day.count || ""}
            </span>
            <span
              className={cn(
                "block w-full rounded-t-[2px]",
                !day.count
                  ? "bg-[var(--surface-muted)]"
                  : day.isToday
                    ? "bg-[var(--primary)]"
                    : "bg-[color-mix(in_srgb,var(--primary)_55%,var(--surface))]",
              )}
              style={{
                height: day.count
                  ? `${Math.max(18, (day.count / max) * 100)}%`
                  : "8%",
              }}
            />
          </span>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1.5 text-center text-[0.65625rem] text-[var(--text-muted)]"
      >
        {days.map((day) => (
          <span
            className={cn(day.isToday && "font-semibold text-[var(--text)]")}
            key={day.date}
          >
            {day.weekday}
          </span>
        ))}
      </div>
    </div>
  );
}

const TREND = {
  up: "text-[var(--success)]",
  down: "text-[var(--danger)]",
  flat: "text-[var(--text-muted)]",
};

export function WeekFigures({
  figures,
  days,
}: {
  figures: WeekFigure[];
  /** The week day by day (none: the figures alone). */
  days?: ServiceDay[];
}) {
  if (!days) return <Figures figures={figures} />;
  return (
    <div className="grid md:grid-cols-2">
      <Figures figures={figures} />
      <div className="border-t border-[var(--border)] md:border-t-0 md:border-l">
        <WeekBars days={days} />
      </div>
    </div>
  );
}

function Figures({ figures }: { figures: WeekFigure[] }) {
  return (
    <div className="grid grid-cols-3 content-center">
      {figures.map((figure) => (
        <div
          className="grid gap-px border-r border-[var(--border)] px-3.5 py-2.5 last:border-r-0"
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
