import { CalendarOff, MapPin, Monitor } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./badge";
import { Card } from "./card";
import { cn } from "./lib/utils";

// Specialist availability (docs/product/booking-plan.md, R2): the weekly
// schedule, a week's preview and time off. Presentational and rendered on
// the server; buttons come in as slots from the portal.

export type AvailabilityWindowMode = "in_person" | "online" | "hybrid";

export interface AvailabilityWindowView {
  id: string;
  timeLabel: string;
  /** The room's name, or "Online". */
  placeLabel: string;
  mode: AvailabilityWindowMode;
  recurrenceLabel?: string;
  note?: string | null;
  actions?: ReactNode;
}

function placeText(
  window: Pick<AvailabilityWindowView, "placeLabel" | "mode">,
) {
  return window.mode === "hybrid"
    ? `${window.placeLabel} + online`
    : window.placeLabel;
}

function PlaceIcon({ mode }: { mode: AvailabilityWindowMode }) {
  const Icon = mode === "online" ? Monitor : MapPin;
  return <Icon aria-hidden="true" className="size-4 shrink-0" />;
}

export function AvailabilityWindowItem({
  window,
}: {
  window: AvailabilityWindowView;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-[var(--border)] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="grid gap-1">
        <p className="font-semibold text-[var(--text)] tabular-nums">
          {window.timeLabel}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <PlaceIcon mode={window.mode} />
          <span>{placeText(window)}</span>
        </p>
        {window.recurrenceLabel || window.note ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {window.recurrenceLabel ? (
              <Badge>{window.recurrenceLabel}</Badge>
            ) : null}
            {window.note ? (
              <span className="text-[var(--text-muted)]">{window.note}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {window.actions ? (
        <div className="flex items-center gap-1">{window.actions}</div>
      ) : null}
    </li>
  );
}

export interface WeeklyScheduleDay {
  /** ISO weekday, 1 Monday … 7 Sunday. */
  weekday: number;
  label: string;
  windows: AvailabilityWindowView[];
  /** e.g. an "add a window" button for this day. */
  action?: ReactNode;
}

/** The recurring week: every weekday with its windows. */
export function WeeklySchedule({
  days,
  className,
}: {
  days: WeeklyScheduleDay[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", className)}>
      {days.map((day) => {
        const headingId = `weekly-schedule-day-${day.weekday}`;
        return (
          <Card
            aria-labelledby={headingId}
            className="flex flex-col gap-3 p-4"
            key={day.weekday}
            role="region"
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                className="font-heading text-base font-semibold text-[var(--text)]"
                id={headingId}
              >
                {day.label}
              </h3>
              {day.action}
            </div>
            {day.windows.length ? (
              <ul>
                {day.windows.map((window) => (
                  <AvailabilityWindowItem key={window.id} window={window} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Brak godzin</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export interface AvailabilityPreviewDay {
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  label: string;
  isToday?: boolean;
  windows: Omit<AvailabilityWindowView, "actions" | "recurrenceLabel">[];
  timeOff: { id: string; label: string; reason?: string | null }[];
}

/** A concrete week: what clients can book, after time off. */
export function AvailabilityWeekPreview({
  title,
  days,
  navigation,
  className,
}: {
  title: string;
  days: AvailabilityPreviewDay[];
  /** Previous / next week links. */
  navigation?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="availability-week-preview-title"
      className={cn("grid gap-3", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          className="font-heading text-lg font-semibold text-[var(--text)]"
          id="availability-week-preview-title"
        >
          {title}
        </h3>
        {navigation}
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <li
            aria-current={day.isToday ? "date" : undefined}
            aria-label={day.label}
            className={cn(
              "flex min-h-28 flex-col gap-2 rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] p-3",
              day.isToday && "border-[var(--primary)]",
            )}
            key={day.date}
          >
            <p className="text-sm font-semibold text-[var(--text)]">
              {day.label}
            </p>
            {day.windows.map((window) => (
              <div
                className={cn(
                  "rounded-[var(--radius-control)] border-l-4 px-2 py-1.5 text-xs",
                  window.mode === "online"
                    ? "border-[var(--info)] bg-[var(--info-soft)]"
                    : "border-[var(--primary)] bg-[var(--primary-soft)]",
                )}
                key={window.id}
              >
                <p className="font-semibold text-[var(--text)] tabular-nums">
                  {window.timeLabel}
                </p>
                <p className="flex items-center gap-1 text-[var(--text-muted)]">
                  <PlaceIcon mode={window.mode} />
                  {placeText(window)}
                </p>
              </div>
            ))}
            {day.timeOff.map((off) => (
              <p
                className="flex items-center gap-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1.5 text-xs text-[var(--text-muted)]"
                key={off.id}
              >
                <CalendarOff aria-hidden="true" className="size-3.5 shrink-0" />
                {off.reason ? `${off.label}: ${off.reason}` : off.label}
              </p>
            ))}
            {day.windows.length === 0 && day.timeOff.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Brak godzin</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
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
