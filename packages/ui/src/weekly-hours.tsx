"use client";

import { Plus, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./lib/utils";
import { Switch } from "./switch";
import { TimeSelect } from "./time-select";

// A week of opening hours: each day open or closed, with one or more
// intervals (e.g. a lunch break), a day a ~38 px row; the intervals as
// small fields. Controlled; validation comes from the form that owns it.

export interface WeeklyHoursInterval {
  startsAt: string;
  endsAt: string;
}

export interface WeeklyHoursDay {
  /** ISO weekday, 1 Monday … 7 Sunday. */
  weekday: number;
  open: boolean;
  intervals: WeeklyHoursInterval[];
}

const DAY_NAMES = [
  "poniedziałek",
  "wtorek",
  "środa",
  "czwartek",
  "piątek",
  "sobota",
  "niedziela",
];
const MAX_INTERVALS = 6;

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * The next interval: an hour after the last one, until 18:00 or an hour;
 * on the grid (`step` minutes) to the end of the day.
 */
function nextInterval(last: WeeklyHoursInterval | undefined, step = 15) {
  const start = Math.min(
    last ? toMinutes(last.endsAt) + 60 : 8 * 60,
    24 * 60 - 2 * step,
  );
  const end = Math.min(Math.max(start + 60, 18 * 60), 24 * 60 - step);
  return { startsAt: toTime(start), endsAt: toTime(end) };
}

export interface WeeklyHoursEditorProps {
  value: WeeklyHoursDay[];
  onChange: (value: WeeklyHoursDay[]) => void;
  /** Messages keyed `dayIndex.intervalIndex`. */
  errors?: Record<string, string>;
  /** Extra actions for a day, e.g. copying its hours to other days. */
  dayActions?: (weekday: number) => ReactNode;
  disabled?: boolean;
  /** Minutes between the times offered (the centre's grid: 60). */
  step?: number;
  className?: string;
}

export function WeeklyHoursEditor({
  value,
  onChange,
  errors = {},
  dayActions,
  disabled,
  step,
  className,
}: WeeklyHoursEditorProps) {
  const id = useId();

  function update(dayIndex: number, day: WeeklyHoursDay) {
    onChange(value.map((one, index) => (index === dayIndex ? day : one)));
  }

  return (
    <ul className={className}>
      {value.map((day, dayIndex) => {
        const name = DAY_NAMES[day.weekday - 1]!;
        return (
          <li
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3.5 py-1.5 sm:grid-cols-[9rem_minmax(0,1fr)_auto]",
              !day.open && "bg-[var(--surface-subtle)]",
            )}
            key={day.weekday}
          >
            <div className="col-start-1 row-start-1 flex min-h-[26px] items-center gap-2.5">
              <Switch
                aria-label={`${name} otwarte`}
                checked={day.open}
                disabled={disabled}
                onCheckedChange={(open) => update(dayIndex, { ...day, open })}
                size="sm"
              />
              <span className="text-[0.8125rem] font-medium text-[var(--text)] capitalize">
                {name}
              </span>
            </div>

            {day.open ? (
              <div className="col-span-full row-start-2 flex flex-wrap items-start gap-x-2 gap-y-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                {day.intervals.map((interval, index) => {
                  const suffix = index ? `, przedział ${index + 1}` : "";
                  const error = errors[`${dayIndex}.${index}`];
                  const errorId = `${id}-${dayIndex}-${index}-error`;
                  const set = (changes: Partial<WeeklyHoursInterval>) =>
                    update(dayIndex, {
                      ...day,
                      intervals: day.intervals.map((one, at) =>
                        at === index ? { ...one, ...changes } : one,
                      ),
                    });
                  return (
                    <div className="grid gap-1" key={index}>
                      <div className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-0.5">
                        <TimeSelect
                          aria-describedby={error ? errorId : undefined}
                          aria-invalid={error ? true : undefined}
                          aria-label={`Od, ${name}${suffix}`}
                          className="h-[26px] w-[4.75rem] rounded-[5px] px-1.5 font-mono text-[0.75rem] font-medium shadow-none"
                          disabled={disabled}
                          onChange={(time) => set({ startsAt: time })}
                          step={step}
                          value={interval.startsAt}
                        />
                        <span
                          aria-hidden="true"
                          className="text-[var(--text-muted)]"
                        >
                          –
                        </span>
                        <TimeSelect
                          aria-describedby={error ? errorId : undefined}
                          aria-invalid={error ? true : undefined}
                          aria-label={`Do, ${name}${suffix}`}
                          className="h-[26px] w-[4.75rem] rounded-[5px] px-1.5 font-mono text-[0.75rem] font-medium shadow-none"
                          disabled={disabled}
                          onChange={(time) => set({ endsAt: time })}
                          step={step}
                          value={interval.endsAt}
                        />
                        {day.intervals.length > 1 ? (
                          <Button
                            aria-label={`Usuń przedział ${index + 1}: ${name}`}
                            disabled={disabled}
                            onClick={() =>
                              update(dayIndex, {
                                ...day,
                                intervals: day.intervals.filter(
                                  (_, at) => at !== index,
                                ),
                              })
                            }
                            className="size-[22px] rounded-[4px]"
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <X aria-hidden="true" className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                      {error ? (
                        <p
                          className="text-xs text-[var(--danger)]"
                          id={errorId}
                          role="alert"
                        >
                          {error}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {day.intervals.length < MAX_INTERVALS ? (
                  <Button
                    aria-label={`Dodaj przedział: ${name}`}
                    className="h-[30px] px-1.5 text-[0.75rem] text-[var(--primary)]"
                    disabled={disabled}
                    onClick={() =>
                      update(dayIndex, {
                        ...day,
                        intervals: [
                          ...day.intervals,
                          nextInterval(day.intervals.at(-1), step),
                        ],
                      })
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                    przedział
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="col-span-full row-start-2 text-[0.8125rem] text-[var(--text-muted)] sm:col-span-1 sm:col-start-2 sm:row-start-1">
                zamknięty
              </p>
            )}

            {dayActions ? (
              <div className="col-start-2 row-start-1 flex items-center justify-end sm:col-start-3">
                {dayActions(day.weekday)}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
