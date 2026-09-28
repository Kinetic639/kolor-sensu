import {
  Building2,
  CalendarOff,
  Clock,
  Layers,
  Lock,
  RotateCw,
  Video,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "./lib/utils";

// Specialist availability (docs/product/booking-plan.md, R2), after the AI
// Studio reference: calendar block bodies, rule cards, stats and time off.
// Presentational; buttons come in as slots.

export type AvailabilityWindowMode = "in_person" | "online" | "hybrid";

export function placeText(placeLabel: string, mode: AvailabilityWindowMode) {
  return mode === "hybrid" ? `${placeLabel} + online` : placeLabel;
}

function PlaceIcon({
  mode,
  className,
}: {
  mode: AvailabilityWindowMode;
  className?: string;
}) {
  const Icon =
    mode === "online" ? Video : mode === "hybrid" ? Layers : Building2;
  return (
    <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", className)} />
  );
}

/** A place chip: the room, "Online", or both. */
export function PlaceChip({
  placeLabel,
  mode,
  className,
}: {
  placeLabel: string;
  mode: AvailabilityWindowMode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[calc(var(--radius-control)*0.75)] border px-1.5 py-0.5 text-[0.6875rem] font-semibold",
        mode === "online"
          ? "border-[color-mix(in_srgb,var(--info)_30%,transparent)] bg-[var(--info-soft)] text-[var(--info)]"
          : "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] text-[var(--text)]",
        className,
      )}
    >
      <PlaceIcon mode={mode} />
      {placeText(placeLabel, mode)}
    </span>
  );
}

/** A colleague's hours in the chosen room: taken, by whom, when. */
export function RoomTakenBody({
  name,
  timeLabel,
}: {
  name: string;
  timeLabel: string;
}) {
  return (
    <div className="grid content-start gap-0.5 text-[0.6875rem] leading-tight">
      <p className="flex items-center gap-1 font-bold text-[var(--text-muted)] uppercase">
        <Lock aria-hidden="true" className="size-3 shrink-0" />
        Zajęte
      </p>
      <p className="line-clamp-2 font-semibold break-words text-[var(--text)]">
        {name}
      </p>
      <p className="text-[var(--text-muted)] tabular-nums">{timeLabel}</p>
    </div>
  );
}

/** What goes inside an availability block in the calendar. */
export function AvailabilityBlockBody({
  timeLabel,
  placeLabel,
  mode,
  note,
  hint,
}: {
  timeLabel: string;
  placeLabel: string;
  mode: AvailabilityWindowMode;
  note?: string | null;
  /** e.g. "Kliknij, aby edytować", shown when the block is tall enough. */
  hint?: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-1">
      <div className="grid gap-1">
        <p className="flex items-center gap-1 font-bold text-[var(--text)] tabular-nums">
          <Clock
            aria-hidden="true"
            className="size-3.5 shrink-0 text-[var(--block-accent)]"
          />
          {timeLabel}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <PlaceChip mode={mode} placeLabel={placeLabel} />
          {note ? (
            <span className="max-w-full truncate text-[0.6875rem] text-[var(--text-muted)] italic">
              {note}
            </span>
          ) : null}
        </div>
      </div>
      {hint ? (
        <p className="text-[0.625rem] font-medium text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface StatDotItem {
  label: string;
  value: string;
  tone: "primary" | "info" | "warning";
}

const DOT_TONES: Record<StatDotItem["tone"], string> = {
  primary: "bg-[var(--primary)]",
  info: "bg-[var(--info)]",
  warning: "bg-[var(--warning)]",
};

/** A row of "● label: value" figures. */
export function StatDots({
  items,
  className,
}: {
  items: StatDotItem[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
        className,
      )}
    >
      {items.map((item) => (
        <div className="flex items-center gap-1.5" key={item.label}>
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-full", DOT_TONES[item.tone])}
          />
          <dt className="font-medium text-[var(--text-muted)]">
            {item.label}:
          </dt>
          <dd className="font-bold text-[var(--text)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OccupancyBar({
  label,
  percent,
  left,
  right,
  className,
}: {
  label: string;
  percent: number;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={cn("grid gap-1.5 text-xs", className)}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--text-muted)]">{label}</span>
        <strong className="text-[var(--text)]">{value}%</strong>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full bg-[var(--border)]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width]"
          style={{ width: `${value}%` }}
        />
      </div>
      {left || right ? (
        <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-[var(--text-muted)]">
          <span>{left}</span>
          <span className="font-semibold text-[var(--primary)]">{right}</span>
        </div>
      ) : null}
    </div>
  );
}

export interface AvailabilityRuleCardProps {
  title: string;
  subtitle?: string;
  recurrenceLabel: string;
  timeLabel: string;
  durationLabel: string;
  placeLabel: string;
  mode: AvailabilityWindowMode;
  /** Accent colour of the room (a CSS value). */
  accent?: string;
  note?: string | null;
  occupancy?: { percent: number; bookedLabel: string; freeLabel: string };
  actions?: ReactNode;
  className?: string;
}

/** One availability rule, as listed under "Reguły i bloki". */
export function AvailabilityRuleCard({
  title,
  subtitle,
  recurrenceLabel,
  timeLabel,
  durationLabel,
  placeLabel,
  mode,
  accent = "var(--primary)",
  note,
  occupancy,
  actions,
  className,
}: AvailabilityRuleCardProps) {
  return (
    <article
      aria-label={title}
      className={cn(
        "rounded-[var(--radius-surface)] border border-l-[6px] border-[var(--border)] border-l-[var(--card-accent)] bg-[var(--surface)] p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5",
        className,
      )}
      style={{ "--card-accent": accent } as CSSProperties}
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
            {subtitle ? (
              <span className="text-xs text-[var(--text-muted)]">
                {subtitle}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-[var(--primary)]">
              <RotateCw aria-hidden="true" className="size-3" />
              {recurrenceLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 font-bold text-[var(--text)] tabular-nums shadow-sm">
              <Clock
                aria-hidden="true"
                className="size-4 text-[var(--primary)]"
              />
              {timeLabel}
              <span className="font-normal text-[var(--text-subtle)]">
                ({durationLabel})
              </span>
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border px-3 py-1.5 font-semibold shadow-sm",
                mode === "online"
                  ? "border-[color-mix(in_srgb,var(--info)_30%,transparent)] bg-[var(--info-soft)] text-[var(--info)]"
                  : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text)]",
              )}
            >
              <PlaceIcon className="size-4" mode={mode} />
              {placeText(placeLabel, mode)}
            </span>
            {note ? (
              <span className="text-[var(--text-muted)] italic">„{note}”</span>
            ) : null}
          </div>
        </div>

        {occupancy ? (
          <OccupancyBar
            className="shrink-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 lg:w-64"
            label="Rezerwacje w tym bloku"
            left={occupancy.bookedLabel}
            percent={occupancy.percent}
            right={occupancy.freeLabel}
          />
        ) : null}

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-end lg:self-center">
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function TimeOffItem({
  label,
  reason,
  actions,
}: {
  label: string;
  reason?: string | null;
  actions?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] py-3 first:border-t-0">
      <div className="flex items-start gap-3">
        <CalendarOff
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]"
        />
        <div className="grid gap-0.5">
          <p className="font-semibold text-[var(--text)]">{label}</p>
          {reason ? (
            <p className="text-sm text-[var(--text-muted)]">{reason}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-1">{actions}</div>
      ) : null}
    </li>
  );
}
