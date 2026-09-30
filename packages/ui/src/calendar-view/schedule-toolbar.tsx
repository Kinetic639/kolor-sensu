import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import {
  ScheduleLocationSelect,
  ScheduleSearch,
  ScheduleSwitches,
  type ScheduleSwitch,
} from "./schedule-controls";

// Above the calendar, after the reference: what the colours mean and the
// view's switches; the date and its neighbours, Dzień / Tydzień,
// Specjaliści / Gabinety, the location and the patient search. The
// navigation is links (rendered on the server, working without
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
  return (
    <nav aria-label={label}>
      <ul className="flex items-center rounded-lg bg-[var(--surface-muted)] p-0.5 text-xs font-medium">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                item.active
                  ? "bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] shadow-sm"
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

const iconButton =
  "flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";

export interface ScheduleToolbarProps {
  nav: ScheduleNav;
  views: SegmentLink[];
  perspectives?: SegmentLink[];
  switches: ScheduleSwitch[];
  /** Locations to choose from (none: no choice). */
  locations?: { value: string; label: string }[];
  search?: boolean;
  /** At the right of the first row (e.g. an action). */
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
  return (
    <div className="space-y-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text)]">
            Model wizualny:
          </span>{" "}
          Dostępność to spokojne tło, wizyty pacjentów to karty pierwszego
          planu.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ScheduleSwitches shown={switches} />
          {actions}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
        <nav
          aria-label={week ? "Tydzień" : "Dzień"}
          className="flex flex-wrap items-center gap-1.5"
        >
          <Link
            aria-label={week ? "Poprzedni tydzień" : "Poprzedni dzień"}
            className={iconButton}
            href={nav.previousHref}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Link>
          <p
            aria-live="polite"
            className="flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold whitespace-nowrap text-[var(--text)] shadow-sm"
          >
            <CalendarIcon
              aria-hidden="true"
              className="size-3.5 text-[var(--text-muted)]"
            />
            <span className="tabular-nums">{nav.label}</span>
          </p>
          <Link
            aria-label={week ? "Następny tydzień" : "Następny dzień"}
            className={iconButton}
            href={nav.nextHref}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            aria-current={nav.isCurrent ? "date" : undefined}
            className="ml-1 flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={nav.todayHref}
          >
            Dziś
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented items={views} label="Zakres" />
          {perspectives ? (
            <Segmented items={perspectives} label="Kolumny" />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {locations ? <ScheduleLocationSelect options={locations} /> : null}
          {search ? <ScheduleSearch /> : null}
        </div>
      </div>
    </div>
  );
}
