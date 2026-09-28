"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import { ChoiceCardGroup } from "./choice-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { cn } from "./lib/utils";

// Repeating events, as calendar apps handle them: picking the weekdays of a
// rule, and asking which occurrences a change or removal applies to.

const DAYS = [
  { value: 1, short: "Pn", name: "poniedziałek" },
  { value: 2, short: "Wt", name: "wtorek" },
  { value: 3, short: "Śr", name: "środa" },
  { value: 4, short: "Cz", name: "czwartek" },
  { value: 5, short: "Pt", name: "piątek" },
  { value: 6, short: "Sb", name: "sobota" },
  { value: 7, short: "Nd", name: "niedziela" },
];

export interface WeekdayPickerProps {
  label: string;
  /** ISO weekdays, 1 Monday … 7 Sunday. */
  value: number[];
  onChange: (value: number[]) => void;
  className?: string;
}

/** Toggle buttons for the days of the week; at least one stays on. */
export function WeekdayPicker({
  label,
  value,
  onChange,
  className,
}: WeekdayPickerProps) {
  return (
    <div
      aria-label={label}
      className={cn("flex flex-wrap gap-1.5", className)}
      role="group"
    >
      {DAYS.map((day) => {
        const on = value.includes(day.value);
        return (
          <button
            aria-label={day.name}
            aria-pressed={on}
            className={cn(
              "flex size-10 items-center justify-center rounded-full border text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
              on
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]",
            )}
            key={day.value}
            onClick={() => {
              if (on && value.length === 1) return;
              onChange(
                on
                  ? value.filter((one) => one !== day.value)
                  : [...value, day.value].sort((a, b) => a - b),
              );
            }}
            type="button"
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

export type RecurrenceScope = "this" | "following" | "all";

const SCOPES: { value: RecurrenceScope; label: string }[] = [
  { value: "this", label: "Tylko ten termin" },
  { value: "following", label: "Ten i następne terminy" },
  { value: "all", label: "Wszystkie terminy" },
];

export interface RecurrenceScopeDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: (scope: RecurrenceScope) => void;
  onCancel: () => void;
}

/** "Which occurrences?" before changing or removing a repeating event. */
export function RecurrenceScopeDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: RecurrenceScopeDialogProps) {
  const [scope, setScope] = useState<RecurrenceScope>("this");
  // Every time it opens, it starts from the safest choice.
  useEffect(() => {
    if (open) setScope("this");
  }, [open]);

  return (
    <Dialog onOpenChange={(next) => (next ? null : onCancel())} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ChoiceCardGroup
          layout="list"
          legend="Zastosuj do"
          name="recurrence-scope"
          onChange={setScope}
          options={SCOPES}
          value={scope}
        />
        <DialogFooter>
          <Button onClick={onCancel} variant="secondary">
            Anuluj
          </Button>
          <Button
            loading={pending}
            onClick={() => onConfirm(scope)}
            variant={destructive ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
