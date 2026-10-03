"use client";

import { type ReactNode, useState } from "react";
import { cn } from "../lib/utils";
import { TooltipProvider } from "../tooltip";

// The day's lanes by room or by person (the dashboard's line of hours).
// Both come rendered from the server; the switch shows one and puts it in
// the address (?os=specjalisci), so a refresh keeps it, without asking the
// server for anything.

export type LaneView = "gabinety" | "specjalisci";

export function LaneSwitch({
  initial,
  rooms,
  people,
  headings,
  end,
}: {
  initial: LaneView;
  rooms: ReactNode;
  people: ReactNode;
  /** Before the switch: each view's title. */
  headings: Record<LaneView, ReactNode>;
  /** After the switch, at the right (the day's navigation). */
  end?: ReactNode;
}) {
  const [view, setView] = useState<LaneView>(initial);
  const show = (next: LaneView) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "gabinety") url.searchParams.delete("os");
    else url.searchParams.set("os", next);
    window.history.replaceState(null, "", url);
  };
  return (
    <TooltipProvider delayDuration={200}>
      {/* The title, the switch in the middle, the day at the right. */}
      <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-[var(--border)] px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-2">
          {headings[view]}
        </span>
        <span
          aria-label="Wiersze osi dnia"
          className="inline-flex overflow-hidden rounded-[5px] border border-[var(--border)]"
          role="group"
        >
          {(
            [
              ["gabinety", "Gabinety"],
              ["specjalisci", "Specjaliści"],
            ] as const
          ).map(([key, label]) => (
            <button
              aria-pressed={view === key}
              className={cn(
                "h-6 border-r border-[var(--border)] px-2.5 text-[0.75rem] last:border-r-0 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
                view === key
                  ? "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]"
                  : "text-[var(--text)] hover:bg-[var(--surface-subtle)]",
              )}
              key={key}
              onClick={() => show(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </span>
        <span className="flex justify-end">{end}</span>
      </div>
      <div hidden={view !== "gabinety"}>{rooms}</div>
      <div hidden={view !== "specjalisci"}>{people}</div>
    </TooltipProvider>
  );
}
