"use client";

import { debounce, useQueryStates } from "nuqs";
import { LoaderCircle, MapPin, Search, X } from "lucide-react";
import {
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import { cn } from "../lib/utils";
import { Switch } from "../switch";
import { calendarDisplayParsers, calendarParsers } from "./params";

// The calendar's controls that run in the browser. Every one is in the
// address and the page renders again on the server (so its links keep
// the state); the display switches (grey out, visits, availability,
// summary) show at once, through the frame's data attributes.

export type ScheduleSwitch =
  "puste" | "wyszarz" | "wizyty" | "dostepnosc" | "podsumowanie";

const LABELS: Record<ScheduleSwitch, string> = {
  puste: "Ukryj puste kolumny",
  wyszarz: "Wyszarz bez dostępności",
  wizyty: "Wizyty",
  dostepnosc: "Dostępność",
  podsumowanie: "Podsumowanie",
};

function useDisplay(startTransition?: TransitionStartFunction) {
  return useQueryStates(calendarDisplayParsers, {
    shallow: false,
    startTransition,
    clearOnDefault: true,
  });
}

export function ScheduleSwitches({ shown }: { shown: ScheduleSwitch[] }) {
  const [pending, startTransition] = useTransition();
  const [display, setDisplay] = useDisplay(startTransition);
  const [{ puste }, setServer] = useQueryStates(
    { puste: calendarParsers.puste },
    { shallow: false, startTransition, clearOnDefault: true },
  );
  const values = { ...display, puste };
  return (
    <div
      aria-busy={pending || undefined}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 shadow-sm"
      role="group"
      aria-label="Widok kalendarza"
    >
      {shown.map((key, index) => (
        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text)] select-none",
            index > 0 && "border-l border-[var(--border)] pl-3",
          )}
          key={key}
        >
          {LABELS[key]}
          <Switch
            checked={values[key]}
            onCheckedChange={(checked) =>
              void (key === "puste"
                ? setServer({ puste: checked })
                : setDisplay({ [key]: checked }))
            }
            size="sm"
          />
        </label>
      ))}
    </div>
  );
}

/** Where: every location, one of them, or online. */
export function ScheduleLocationSelect({
  options,
}: {
  options: { value: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [{ lokalizacja }, setParams] = useQueryStates(
    { lokalizacja: calendarParsers.lokalizacja },
    { shallow: false, startTransition, clearOnDefault: true },
  );
  return (
    <label className="relative block">
      <span className="sr-only">Lokalizacja</span>
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 animate-spin text-[var(--text-subtle)]"
        />
      ) : (
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-[var(--text-subtle)]"
        />
      )}
      <select
        className="h-8 cursor-pointer appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] pr-3 pl-7 text-xs text-[var(--text)] shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        onChange={(event) =>
          setParams({ lokalizacja: event.target.value || null })
        }
        value={lokalizacja ?? ""}
      >
        <option value="">Wszystkie lokalizacje</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Find a patient: the others' visits fade. */
export function ScheduleSearch() {
  const [pending, startTransition] = useTransition();
  const [{ q }, setParams] = useQueryStates(
    { q: calendarParsers.q },
    { shallow: false, startTransition, clearOnDefault: true },
  );
  return (
    <label className="relative block">
      <span className="sr-only">Szukaj pacjenta</span>
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 animate-spin text-[var(--text-subtle)]"
        />
      ) : (
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--text-subtle)]"
        />
      )}
      <input
        className="h-8 w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] pr-3 pl-8 text-xs text-[var(--text)] shadow-sm placeholder:text-[var(--text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none sm:w-44"
        maxLength={100}
        onChange={(event) =>
          setParams(
            { q: event.target.value || null },
            {
              limitUrlUpdates: event.target.value ? debounce(300) : undefined,
            },
          )
        }
        placeholder="Szukaj pacjenta…"
        type="search"
        value={q ?? ""}
      />
    </label>
  );
}

/** Closes the summary panel (the "Podsumowanie" switch opens it again). */
export function SummaryCloseButton() {
  const [, setDisplay] = useDisplay();
  return (
    <button
      aria-label="Zamknij podsumowanie"
      className="rounded-md p-1 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      onClick={() => setDisplay({ podsumowanie: false })}
      title="Zamknij podsumowanie"
      type="button"
    >
      <X aria-hidden="true" className="size-4" />
    </button>
  );
}

/**
 * The calendar's frame: the display switches as data attributes, so the
 * server-rendered grid under it hides visits or availability, greys out
 * empty columns and shows the summary without another request.
 */
export function ScheduleCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [display] = useDisplay();
  return (
    <div
      className={cn(
        "[&[data-grey]_[data-unavailable]]:bg-[var(--surface-subtle)] [&[data-hide-availability]_[data-availability]]:hidden [&[data-hide-summary]_[data-summary]]:hidden [&[data-hide-visits]_[data-visit]]:hidden",
        className,
      )}
      data-grey={display.wyszarz || undefined}
      data-hide-availability={!display.dostepnosc || undefined}
      data-hide-summary={!display.podsumowanie || undefined}
      data-hide-visits={!display.wizyty || undefined}
    >
      {children}
    </div>
  );
}
