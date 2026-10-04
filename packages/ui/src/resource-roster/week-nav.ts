import { addDays, formatDateRange, visitsLabel } from "@repo/scheduling";
import type { ScheduleNav } from "../calendar-view/schedule-toolbar";

// A roster's week and its neighbours, as links; this week has no date in
// the address.

export function rosterWeekNav(
  /** The roster's address for a week's Monday (null: this week). */
  href: (monday: string | null) => string,
  { week, thisWeek }: { week: string; thisWeek: string },
) {
  const go = (monday: string) => href(monday === thisWeek ? null : monday);
  return {
    label: formatDateRange(week, addDays(week, 6)),
    previousHref: go(addDays(week, -7)),
    nextHref: go(addDays(week, 7)),
    currentHref: week === thisWeek ? null : go(thisWeek),
  };
}

/** A roster's week in a line: `Zespół: 59 wizyt · 62% obłożenia`. */
export function rosterWeekSummary(
  label: string,
  weeks: {
    visitCount: number;
    bookedMinutes: number;
    availableMinutes: number;
  }[],
) {
  const sum = (key: "visitCount" | "bookedMinutes" | "availableMinutes") =>
    weeks.reduce((total, one) => total + one[key], 0);
  const available = sum("availableMinutes");
  const percent = available
    ? Math.round((sum("bookedMinutes") / available) * 100)
    : 0;
  return `${label}: ${visitsLabel(sum("visitCount"))} · ${percent}% obłożenia`;
}

/** The same, for the calendar's bar on a resource's page (`Grafik`). */
export function scheduleWeekNav(
  href: (monday: string | null) => string,
  weeks: { week: string; thisWeek: string },
): ScheduleNav {
  const nav = rosterWeekNav(href, weeks);
  return {
    unit: "tydzień",
    label: nav.label,
    previousHref: nav.previousHref,
    nextHref: nav.nextHref,
    todayHref: href(null),
    isCurrent: nav.currentHref === null,
  };
}
