"use client";

import { debounce, useQueryStates } from "nuqs";
import {
  ChartColumn,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
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

const ICON =
  "inline-grid size-7 shrink-0 place-items-center rounded-[5px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

/** The display switches, in a menu under the sliders icon ("Widok"). */
export function ScheduleViewMenu({ shown }: { shown: ScheduleSwitch[] }) {
  const [pending, startTransition] = useTransition();
  const [display, setDisplay] = useDisplay(startTransition);
  const [{ puste }, setServer] = useQueryStates(
    { puste: calendarParsers.puste },
    { shallow: false, startTransition, clearOnDefault: true },
  );
  const values = { ...display, puste };
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Widok"
        className={cn(ICON, "data-[state=open]:bg-[var(--surface-muted)]")}
        title="Widok"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <SlidersHorizontal aria-hidden="true" className="size-4" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div
          aria-busy={pending || undefined}
          aria-label="Widok kalendarza"
          role="group"
        >
          {shown.map((key) => (
            <label
              className="flex h-8 cursor-pointer items-center justify-between gap-3 rounded-[5px] px-2 text-[0.8125rem] text-[var(--text)] select-none hover:bg-[var(--surface-subtle)]"
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
      </PopoverContent>
    </Popover>
  );
}

/** Whether the week's summary drawer is open, and how to set it. */
export function useSummaryOpen() {
  const [display, setDisplay] = useDisplay();
  return [
    display.podsumowanie,
    (open: boolean) => void setDisplay({ podsumowanie: open }),
  ] as const;
}

/** Opens and closes the week's summary drawer. */
export function ScheduleSummaryToggle() {
  const [display, setDisplay] = useDisplay();
  return (
    <button
      aria-label="Podsumowanie"
      aria-pressed={display.podsumowanie}
      className={cn(
        ICON,
        display.podsumowanie &&
          "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]",
      )}
      onClick={() => setDisplay({ podsumowanie: !display.podsumowanie })}
      title="Podsumowanie"
      type="button"
    >
      <ChartColumn aria-hidden="true" className="size-4" />
    </button>
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
        className="h-7 max-w-44 cursor-pointer appearance-none truncate rounded-[5px] border border-[var(--border)] bg-[var(--surface)] pr-2.5 pl-7 text-[0.75rem] text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
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
          className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 animate-spin text-[var(--text-subtle)]"
        />
      ) : (
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-[var(--text-subtle)]"
        />
      )}
      <input
        className="h-7 w-36 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] pr-2.5 pl-7 text-[0.75rem] text-[var(--text)] transition-[width] duration-200 placeholder:text-[var(--text-subtle)] focus:w-48 focus-visible:border-[var(--primary)] focus-visible:outline-none motion-reduce:transition-none [&::-webkit-search-cancel-button]:hidden"
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
        "[&[data-grey]_[data-unavailable]]:bg-[var(--surface-subtle)] [&[data-grey]_[data-unavailable][role=group]]:[background-image:repeating-linear-gradient(135deg,transparent_0_5px,color-mix(in_srgb,var(--text-subtle)_16%,transparent)_5px_6px)] [&[data-hide-availability]_[data-availability]]:hidden [&[data-hide-summary]_[data-summary]]:hidden [&[data-hide-visits]_[data-visit]]:hidden",
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
