import { AlertTriangle, Blend, Building2, Video } from "lucide-react";
import type { ReactNode } from "react";
import type { AvailabilityWindowMode } from "./availability";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "./lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

// A room's week (admin, Gabinety → Grafik), after the AI Studio reference:
// who has the room when, and a summary of how full it is. Presentational.

const MODE_LABELS: Record<AvailabilityWindowMode, string> = {
  in_person: "Stacjonarnie",
  online: "Online",
  hybrid: "Hybrydowo",
};

// Hybrid: two overlapping circles, the room and online at once.
const MODE_ICONS = { in_person: Building2, online: Video, hybrid: Blend };

/**
 * What goes inside a specialist's block in the room's calendar: the
 * avatar, the hours and the name beside it, and the form of work as an
 * icon in the corner (named in a tooltip and for screen readers).
 */
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
  const modeLabel = MODE_LABELS[mode];
  return (
    <div className="grid min-w-0 content-start gap-1">
      <div className="flex items-center gap-1.5">
        <Avatar className="size-8 ring-2 ring-[var(--block-accent)]">
          {avatarUrl ? <AvatarImage alt="" src={avatarUrl} /> : null}
          <AvatarFallback className="bg-[var(--surface)] text-[0.625rem] font-bold text-[var(--text)]">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1">
          {/* The hours and the form's icon share a line, centred together;
              the icon's button does not make the line taller. */}
          <div className="flex items-center justify-between gap-1">
            <p className="leading-tight font-bold whitespace-nowrap text-[var(--text)] tabular-nums">
              {timeLabel}
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={`Forma pracy: ${modeLabel.toLowerCase()}`}
                    className="-my-1.5 -mr-1 flex size-6 shrink-0 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    type="button"
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{modeLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="line-clamp-2 leading-tight font-semibold break-words text-[var(--text)]">
            {name}
          </p>
        </div>
      </div>
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
