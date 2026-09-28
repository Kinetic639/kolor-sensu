import { AlertTriangle, Building2, Layers, Video } from "lucide-react";
import type { ReactNode } from "react";
import type { AvailabilityWindowMode } from "./availability";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "./lib/utils";

// A room's week (admin, Gabinety → Grafik), after the AI Studio reference:
// who has the room when, and a summary of how full it is. Presentational.

const MODE_LABELS: Record<AvailabilityWindowMode, string> = {
  in_person: "Stacjonarnie",
  online: "Online",
  hybrid: "Stacjonarnie + online",
};

const MODE_ICONS = { in_person: Building2, online: Video, hybrid: Layers };

/** What goes inside a specialist's block in the room's calendar. */
export function RoomScheduleBlockBody({
  name,
  initials,
  avatarUrl,
  timeLabel,
  mode,
  warning,
}: {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  timeLabel: string;
  mode: AvailabilityWindowMode;
  /** e.g. "Poza godzinami otwarcia". */
  warning?: string;
}) {
  const Icon = MODE_ICONS[mode];
  return (
    // Day columns are narrow: the avatar sits by the hours, the rest takes
    // the block's full width.
    <div className="grid min-w-0 content-start gap-1">
      <div className="flex items-start gap-1.5">
        <Avatar className="size-6 ring-2 ring-[var(--block-accent)]">
          {avatarUrl ? <AvatarImage alt="" src={avatarUrl} /> : null}
          <AvatarFallback className="bg-[var(--surface)] text-[0.5625rem] font-bold text-[var(--text)]">
            {initials}
          </AvatarFallback>
        </Avatar>
        <p className="min-w-0 leading-tight font-bold text-[var(--text)] tabular-nums">
          {timeLabel}
        </p>
      </div>
      <p className="line-clamp-2 leading-tight font-semibold break-words text-[var(--text)]">
        {name}
      </p>
      <p className="flex min-w-0 items-center gap-1 text-[0.6875rem] text-[var(--text-muted)]">
        <Icon aria-hidden="true" className="size-3 shrink-0" />
        <span className="truncate">{MODE_LABELS[mode]}</span>
      </p>
      {warning ? (
        <p className="flex items-start gap-1 text-[0.6875rem] leading-tight font-semibold text-[var(--warning-foreground)]">
          <AlertTriangle aria-hidden="true" className="mt-px size-3 shrink-0" />
          {warning}
        </p>
      ) : null}
    </div>
  );
}

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** How full the room is: a ring with the percentage, a label and detail. */
export function OccupancyRing({
  label,
  percent,
  detail,
  note,
  className,
}: {
  label: string;
  /** Null when it cannot be told (no opening hours). */
  percent: number | null;
  detail?: ReactNode;
  /** A line under the detail, e.g. a warning. */
  note?: ReactNode;
  className?: string;
}) {
  const value = percent === null ? 0 : Math.max(0, Math.round(percent));
  const over = value > 100;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3",
        className,
      )}
    >
      <div
        aria-label={percent === null ? undefined : label}
        aria-valuemax={percent === null ? undefined : 100}
        aria-valuemin={percent === null ? undefined : 0}
        aria-valuenow={percent === null ? undefined : value}
        className="relative size-14 shrink-0"
        role={percent === null ? undefined : "progressbar"}
      >
        <svg
          aria-hidden="true"
          className="size-full -rotate-90"
          viewBox="0 0 48 48"
        >
          <circle
            className="stroke-[var(--surface-muted)]"
            cx="24"
            cy="24"
            fill="none"
            r={RADIUS}
            strokeWidth="5"
          />
          <circle
            className={
              over ? "stroke-[var(--warning)]" : "stroke-[var(--primary)]"
            }
            cx="24"
            cy="24"
            fill="none"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(value, 100) / 100)}
            strokeLinecap="round"
            strokeWidth="5"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--text)] tabular-nums">
          {percent === null ? "–" : `${value}%`}
        </span>
      </div>
      <div className="grid min-w-0 gap-0.5">
        <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
        {detail ? (
          <p className="text-xs text-[var(--text-muted)]">{detail}</p>
        ) : null}
        {note ? (
          <p className="text-[0.6875rem] font-medium text-[var(--warning-foreground)]">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A row of the summary: an icon, a label and a value (inside a `<dl>`). */
export function ScheduleFigure({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
      <dt className="flex items-center gap-2 text-[var(--text-muted)]">
        {icon}
        {label}
      </dt>
      <dd className="font-bold text-[var(--text)] tabular-nums">{value}</dd>
    </div>
  );
}
