"use client";

import { Check } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "./lib/utils";

// A choice between a few options shown as cards (e.g. in person / online,
// a room). Native radio inputs: keyboard, forms and screen readers work as
// for any radio group.

export interface ChoiceCardOption<Value extends string> {
  value: Value;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Accent colour for the left edge (a CSS value). */
  accent?: string;
  disabled?: boolean;
}

export interface ChoiceCardGroupProps<Value extends string> {
  legend: string;
  name: string;
  value: Value | null;
  onChange: (value: Value) => void;
  options: ChoiceCardOption<Value>[];
  /** `grid`: equal tiles in a row; `list`: one per line. */
  layout?: "grid" | "list";
  error?: string;
  className?: string;
}

export function ChoiceCardGroup<Value extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  layout = "grid",
  error,
  className,
}: ChoiceCardGroupProps<Value>) {
  const errorId = useId();
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className={cn("space-y-2", className)}
    >
      <legend className="mb-2 text-sm font-semibold text-[var(--text)]">
        {legend}
      </legend>
      <div
        className={cn(
          "gap-2",
          layout === "grid"
            ? "grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))]"
            : "grid",
        )}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              className={cn(
                "relative flex cursor-pointer gap-3 rounded-[var(--radius-control)] border bg-[var(--surface)] p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]",
                layout === "grid"
                  ? "flex-col items-center text-center"
                  : "items-center justify-between",
                option.accent && "border-l-4 border-l-[var(--choice-accent)]",
                checked
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] font-semibold text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]",
                option.disabled && "cursor-not-allowed opacity-60",
              )}
              key={option.value}
              style={
                option.accent
                  ? ({ "--choice-accent": option.accent } as CSSProperties)
                  : undefined
              }
            >
              <input
                checked={checked}
                className="sr-only"
                disabled={option.disabled}
                name={name}
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              {option.icon ? (
                <span aria-hidden="true" className="text-[var(--primary)]">
                  {option.icon}
                </span>
              ) : null}
              <span
                className={cn("grid gap-0.5", layout === "list" && "flex-1")}
              >
                <span className="text-[var(--text)]">{option.label}</span>
                {option.description ? (
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    {option.description}
                  </span>
                ) : null}
              </span>
              {checked ? (
                <Check
                  aria-hidden="true"
                  className={cn(
                    "size-4 text-[var(--primary)]",
                    layout === "grid" && "absolute top-2 right-2",
                  )}
                />
              ) : null}
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-[var(--danger)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
