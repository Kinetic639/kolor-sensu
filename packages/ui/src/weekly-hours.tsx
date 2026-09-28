"use client";

import { Plus, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./lib/utils";
import { Switch } from "./switch";
import { TimeSelect } from "./time-select";

// A week of opening hours: each day open or closed, with one or more
// intervals (e.g. a lunch break). Controlled; validation comes from the
// form that owns it.

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

/** The next interval: an hour after the last one, until 18:00 or an hour. */
function nextInterval(last: WeeklyHoursInterval | undefined) {
  const start = Math.min(
    last ? toMinutes(last.endsAt) + 60 : 8 * 60,
    23 * 60 - 15,
  );
  const end = Math.min(Math.max(start + 60, 18 * 60), 23 * 60 + 45);
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
  className?: string;
}

export function WeeklyHoursEditor({
  value,
  onChange,
  errors = {},
  dayActions,
  disabled,
  className,
}: WeeklyHoursEditorProps) {
  const id = useId();

  function update(dayIndex: number, day: WeeklyHoursDay) {
    onChange(value.map((one, index) => (index === dayIndex ? day : one)));
  }

  return (
    <ul
      className={cn(
        "divide-y divide-[var(--border)] rounded-[var(--radius-control)] border border-[var(--border)]",
        className,
      )}
    >
      {value.map((day, dayIndex) => {
        const name = DAY_NAMES[day.weekday - 1]!;
        return (
          <li
            className={cn(
              "grid gap-3 p-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start",
              !day.open && "bg-[var(--surface-subtle)]",
            )}
            key={day.weekday}
          >
            <div className="flex min-h-10 items-center gap-3">
              <Switch
                aria-label={`${name} otwarte`}
                checked={day.open}
                disabled={disabled}
                onCheckedChange={(open) => update(dayIndex, { ...day, open })}
              />
              <span className="text-sm font-semibold text-[var(--text)] capitalize">
                {name}
              </span>
            </div>

            {day.open ? (
              <div className="grid gap-2">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <TimeSelect
                          aria-describedby={error ? errorId : undefined}
                          aria-invalid={error ? true : undefined}
                          aria-label={`Od, ${name}${suffix}`}
                          className="w-28"
                          disabled={disabled}
                          onChange={(time) => set({ startsAt: time })}
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
                          className="w-28"
                          disabled={disabled}
                          onChange={(time) => set({ endsAt: time })}
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
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <X aria-hidden="true" className="size-4" />
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
                    className="justify-self-start"
                    disabled={disabled}
                    onClick={() =>
                      update(dayIndex, {
                        ...day,
                        intervals: [
                          ...day.intervals,
                          nextInterval(day.intervals.at(-1)),
                        ],
                      })
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                    Dodaj przedział
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="flex min-h-10 items-center text-sm text-[var(--text-muted)]">
                Zamknięte
              </p>
            )}

            {dayActions ? (
              <div className="flex min-h-10 items-center justify-end">
                {dayActions(day.weekday)}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
