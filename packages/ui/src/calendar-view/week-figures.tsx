import type { Occupancy, PersonalWeekView } from "@repo/scheduling";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { hoursShort, themeOf } from "./schedule-parts";

// A week in numbers, wherever it is summed up (the calendar's summary, a
// specialist's panel and page): the figures in one row, the occupancy as
// a short bar, the next visits. Rendered on the server.

export interface Figure {
  label: string;
  value: string;
  note?: string;
  /** The value's colour. */
  tone?: string;
}

/** Figures side by side, a thin line between. */
export function Figures({
  items,
  className,
  stacked = false,
}: {
  items: Figure[];
  className?: string;
  /** Each note on a line of its own (a narrow column). */
  stacked?: boolean;
}) {
  return (
    <dl
      className={cn("grid border-b border-[var(--border)]", className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item, index) => (
        <div
          className={cn(
            "grid content-center gap-px px-3 py-2.5",
            index > 0 && "border-l border-[var(--border)]",
          )}
          key={item.label}
        >
          <dt className="text-[0.71875rem] text-[var(--text-muted)]">
            {item.label}
          </dt>
          <dd
            className="text-[1.0625rem] leading-tight font-semibold text-[var(--text)] tabular-nums"
            style={item.tone ? { color: item.tone } : undefined}
          >
            {item.value}
            {item.note ? (
              <span
                className={cn(
                  "text-[0.71875rem] font-normal text-[var(--text-muted)]",
                  stacked ? "block" : "ml-1",
                )}
              >
                {item.note}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Visits, occupancy (booked of available) and the hours still free. */
export function weekFigures(
  occupancy: Occupancy,
  { visitsLabel = "Wizyty" }: { visitsLabel?: string } = {},
): Figure[] {
  return [
    { label: visitsLabel, value: String(occupancy.visitCount) },
    {
      label: "Obłożenie",
      value: `${occupancy.percent}%`,
      note: `${hoursShort(occupancy.bookedHours)} z ${hoursShort(occupancy.availableHours)}`,
      tone: occupancy.overbooked ? "var(--danger)" : undefined,
    },
    {
      label: "Wolne",
      value: hoursShort(occupancy.freeHours),
      tone: "var(--primary)",
    },
  ];
}

/** The next visits: who, when, where (in the place's colour). */
export function UpcomingVisitList({
  upcoming,
  visitHref,
  empty,
}: {
  upcoming: PersonalWeekView["summary"]["upcoming"];
  visitHref: (visitId: string) => string;
  /** What no visit says (none: nothing shown). */
  empty?: ReactNode;
}) {
  if (!upcoming.length) {
    return empty ? (
      <p className="px-3 py-4 text-[0.8125rem] text-[var(--text-muted)]">
        {empty}
      </p>
    ) : null;
  }
  return (
    <ul>
      {upcoming.map((slot) => {
        const theme = themeOf(slot.place);
        return (
          <li key={slot.key}>
            <Link
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)] focus-visible:outline-none"
              href={visitHref(slot.visitId)}
              scroll={false}
            >
              <span className="truncate text-[0.8125rem] font-medium text-[var(--text)]">
                {slot.client}
              </span>
              <span className="text-[0.71875rem] text-[var(--text-muted)] tabular-nums">
                {slot.day}, {slot.time}
              </span>
              <span
                className="col-span-2 flex items-center gap-1.5 text-[0.71875rem] font-medium"
                style={{ color: theme.text }}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                />
                {slot.place.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
