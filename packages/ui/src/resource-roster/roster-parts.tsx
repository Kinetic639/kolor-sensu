import type { NowStatus } from "@repo/scheduling";
import { hoursShort } from "../calendar-view/schedule-parts";
import { cn } from "../lib/utils";

// The small pieces of a roster row (the team, the rooms): the week as a
// strip of days, what is happening now, how booked. Rendered on the
// server.

export interface StripDay {
  key: string;
  /** `Pn` */
  weekday: string;
  isToday: boolean;
  /** Available or open (tinted), off (plain) or closed (hatched). */
  state: "on" | "off" | "closed";
  /** The day's colour (its room's); default: the accent. */
  color?: string;
  /** Booked of available; the fill from the bottom. */
  percent: number;
  overbooked: boolean;
  /** What the day is, for the tooltip and screen readers. */
  title: string;
}

const HATCH =
  "bg-[repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--text-subtle)_22%,transparent)_4px_5px)]";

/** The week, a cell a day: tinted when on, filled as booked, today outlined. */
export function WeekStrip({
  days,
  label,
  className,
}: {
  days: StripDay[];
  /** `Tydzień: Anna Kłobuchowska` */
  label: string;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn("grid grid-cols-7 gap-1", className)}>
      {days.map((day) => {
        const color = day.color ?? "var(--primary)";
        return (
          <li
            className="grid min-w-0 justify-items-stretch gap-1 text-center"
            key={day.key}
            title={day.title}
          >
            <span className="sr-only">{day.title}</span>
            <span
              aria-hidden="true"
              className={cn(
                "relative block h-[22px] overflow-hidden rounded-[4px]",
                day.state === "closed"
                  ? HATCH
                  : day.state === "off" && "bg-[var(--surface-muted)]",
                day.isToday &&
                  "outline-2 outline-offset-1 outline-[var(--text)] outline-solid",
              )}
              style={
                day.state === "on"
                  ? {
                      background: `color-mix(in srgb, ${color} 13%, var(--surface))`,
                      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`,
                    }
                  : undefined
              }
            >
              {day.state === "on" && day.percent > 0 ? (
                <span
                  className="absolute inset-x-0 bottom-0"
                  style={{
                    height: `${Math.min(100, day.percent)}%`,
                    background: day.overbooked
                      ? "var(--warning)"
                      : `color-mix(in srgb, ${color} 75%, var(--text))`,
                  }}
                />
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "text-[0.59375rem] leading-none",
                day.isToday
                  ? "font-bold text-[var(--text)]"
                  : "text-[var(--text-muted)]",
              )}
            >
              {day.weekday}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const DOT: Record<NowStatus["tone"], string> = {
  busy: "var(--danger)",
  free: "var(--success)",
  later: "var(--info)",
  off: "var(--text-subtle)",
  warn: "var(--warning)",
};

/** What is happening now, with a dot, and what comes next. */
export function NowLine({ status }: { status: NowStatus | null }) {
  if (!status) {
    return <span className="text-[0.8125rem] text-[var(--text-muted)]">—</span>;
  }
  const dot = DOT[status.tone];
  return (
    <span className="grid min-w-0 gap-0.5 text-[0.8125rem]">
      <span className="flex min-w-0 items-center gap-1.5 font-semibold text-[var(--text)]">
        <span
          aria-hidden="true"
          className="size-[7px] shrink-0 rounded-full"
          style={{
            background: dot,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${dot} 22%, transparent)`,
          }}
        />
        <span className="truncate">{status.title}</span>
      </span>
      {status.detail ? (
        <span className="truncate pl-[13px] text-[0.75rem] text-[var(--text-muted)]">
          {status.detail}
        </span>
      ) : null}
    </span>
  );
}

/** `78%  21,5h z 26h` over a bar; over what is available, in warning. */
export function LoadMeter({
  occupancy,
}: {
  occupancy: {
    percent: number;
    overbooked: boolean;
    bookedHours: number;
    availableHours: number;
  };
}) {
  const { percent, overbooked } = occupancy;
  return (
    <span className="grid min-w-0 gap-1">
      <span
        className={cn(
          "truncate text-[0.9375rem] leading-none font-semibold tabular-nums",
          overbooked
            ? "text-[var(--warning-foreground)]"
            : "text-[var(--text)]",
        )}
      >
        {percent}%
        <span className="ml-1 text-[0.6875rem] font-normal text-[var(--text-muted)]">
          {hoursShort(occupancy.bookedHours)} z{" "}
          {hoursShort(occupancy.availableHours)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="block h-[5px] overflow-hidden rounded-full bg-[var(--surface-muted)]"
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.min(100, percent)}%`,
            background: overbooked ? "var(--warning)" : "var(--primary)",
          }}
        />
      </span>
    </span>
  );
}
