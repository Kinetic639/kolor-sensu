import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";
import {
  ScheduleLocationSelect,
  ScheduleSearch,
  ScheduleSummaryToggle,
  ScheduleViewMenu,
  type ScheduleSwitch,
} from "./schedule-controls";

// Above the calendar, one 40 px bar, as the tables' and the dashboard's:
// the day (or week) and its neighbours on the left, the calendar icon
// back to today; Dzień / Tydzień and Specjaliści / Gabinety in the
// middle; the location, the patient search, the "Widok" menu with the
// display switches, the week's summary and the actions on the right.
// The navigation is links (rendered on the server, working without
// JavaScript); the switches, location and search run in the browser.

export interface ScheduleNav {
  label: string;
  previousHref: string;
  nextHref: string;
  todayHref: string;
  isCurrent: boolean;
  unit: "dzień" | "tydzień";
}

export interface SegmentLink {
  key: string;
  label: string;
  href: string;
  active: boolean;
}

function Segmented({ label, items }: { label: string; items: SegmentLink[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5 text-[0.75rem]">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex h-[22px] items-center rounded-[4px] px-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                item.active
                  ? "bg-[var(--surface)] font-semibold text-[var(--text)] shadow-[0_1px_2px_rgb(16_32_28/0.12)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const ICON =
  "inline-grid size-7 shrink-0 place-items-center rounded-[5px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

export interface ScheduleToolbarProps {
  nav: ScheduleNav;
  views: SegmentLink[];
  perspectives?: SegmentLink[];
  /** The display switches; "podsumowanie" becomes a button of its own. */
  switches: ScheduleSwitch[];
  /** Locations to choose from (none: no choice). */
  locations?: { value: string; label: string }[];
  search?: boolean;
  /** At the right end (e.g. "Nowa wizyta"). */
  actions?: ReactNode;
}

export function ScheduleToolbar({
  nav,
  views,
  perspectives,
  switches,
  locations,
  search = true,
  actions,
}: ScheduleToolbarProps) {
  const week = nav.unit === "tydzień";
  const summary = switches.includes("podsumowanie");
  const menu = switches.filter((key) => key !== "podsumowanie");
  return (
    <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
      <nav
        aria-label={week ? "Tydzień" : "Dzień"}
        className="flex items-center gap-0.5"
      >
        <Link
          aria-label={week ? "Poprzedni tydzień" : "Poprzedni dzień"}
          className={ICON}
          href={nav.previousHref}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                aria-current={nav.isCurrent ? "date" : undefined}
                aria-label="Dziś"
                className={cn(
                  ICON,
                  nav.isCurrent &&
                    "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]",
                )}
                href={nav.todayHref}
              >
                <CalendarDays aria-hidden="true" className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Dziś</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Link
          aria-label={week ? "Następny tydzień" : "Następny dzień"}
          className={ICON}
          href={nav.nextHref}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
        <p
          aria-live="polite"
          className="ml-1.5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--text)] tabular-nums"
        >
          {nav.label}
        </p>
      </nav>
      <div className="flex items-center gap-2 lg:mx-auto">
        <Segmented items={views} label="Zakres" />
        {perspectives ? (
          <Segmented items={perspectives} label="Kolumny" />
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        {locations ? <ScheduleLocationSelect options={locations} /> : null}
        {search ? <ScheduleSearch /> : null}
        {menu.length ? <ScheduleViewMenu shown={menu} /> : null}
        {summary ? <ScheduleSummaryToggle /> : null}
        {actions ? (
          <>
            <span
              aria-hidden="true"
              className="mx-1 h-4 w-px bg-[var(--border)]"
            />
            {actions}
          </>
        ) : null}
      </div>
    </div>
  );
}
