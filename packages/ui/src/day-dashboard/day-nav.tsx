"use client";

import type { DayNav as Nav } from "@repo/scheduling";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

// The day the dashboard's line shows: the day before, the date (its
// calendar icon takes back to today), the day after. Links (the server renders the day asked for,
// ?dzien=…), built from the address as it is, so the lanes shown
// (?os=…, switched in the browser) stay.

const BUTTON =
  "inline-flex h-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--surface)] text-[0.75rem] font-medium text-[var(--text)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

export function DayNav({ nav }: { nav: Nav }) {
  const path = usePathname();
  const search = useSearchParams();
  const href = (date: string | null) => {
    const params = new URLSearchParams(search.toString());
    if (date) params.set("dzien", date);
    else params.delete("dzien");
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  };
  return (
    <nav aria-label="Dzień" className="flex items-center gap-1">
      <Link
        aria-label="Poprzedni dzień"
        className={cn(BUTTON, "w-7")}
        href={href(nav.previous)}
        scroll={false}
      >
        <ChevronLeft aria-hidden="true" className="size-3.5" />
      </Link>
      <span className="flex h-7 min-w-[9.5rem] items-center justify-center gap-1 px-0.5">
        {/* The calendar icon takes back to today. */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                aria-current={nav.isToday ? "date" : undefined}
                aria-label="Dziś"
                className={cn(
                  "inline-grid size-6 place-items-center rounded-[5px] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                  nav.isToday
                    ? "text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]",
                )}
                href={href(null)}
                scroll={false}
              >
                <CalendarDays aria-hidden="true" className="size-3.5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Dziś</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span
          aria-live="polite"
          className="text-[0.78rem] font-semibold whitespace-nowrap tabular-nums"
        >
          {nav.label}
        </span>
      </span>
      <Link
        aria-label="Następny dzień"
        className={cn(BUTTON, "w-7")}
        href={href(nav.next)}
        scroll={false}
      >
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </Link>
    </nav>
  );
}
