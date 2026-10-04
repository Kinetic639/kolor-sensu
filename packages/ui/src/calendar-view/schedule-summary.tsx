import {
  visitsLabel,
  type ComparisonSummary,
  type PersonalWeekView,
} from "@repo/scheduling";
import { CalendarCog } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { scheduleTheme } from "../resource-colors";
import { hoursShort, PersonAvatar } from "./schedule-parts";
import { SummaryDrawer } from "./summary-drawer";
import { Figures, UpcomingVisitList, weekFigures } from "./week-figures";

// The week summed up, in a drawer over the calendar (the toolbar's
// "Podsumowanie"): for the centre, the week compared (visits, occupancy,
// what is free, then each specialist or room from the busiest, a bar in
// their colour); for a specialist, their own week and the next visits.
// Figures in one row, rows with bars, as on the dashboard.

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="sticky top-0 z-[1] flex h-6 items-center border-b border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[0.6875rem] font-semibold tracking-[0.03em] text-[var(--text-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <span className="col-span-2 block h-[5px] overflow-hidden rounded-full bg-[var(--surface-muted)]">
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
      />
    </span>
  );
}

const barColor = (percent: number, overbooked: boolean) =>
  overbooked
    ? "var(--danger)"
    : percent >= 75
      ? "var(--primary)"
      : "var(--text-muted)";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The week compared: everyone's occupancy (the centre's week view). */
export function ComparisonSummaryPanel({
  summary,
  byRoom,
  period,
}: {
  summary: ComparisonSummary;
  byRoom: boolean;
  /** `Tydzień 28 wrz – 4 paź` */
  period: string;
}) {
  const { occupancy } = summary;
  const accent = (item: {
    id: string;
    color: string | null;
    colorSeed: string;
  }) => scheduleTheme(item.color, item.colorSeed, item.id === "online").accent;
  const marker = (item: {
    id: string;
    name: string;
    avatarUrl: string | null;
    color: string | null;
    colorSeed: string;
  }) =>
    byRoom ? (
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: accent(item) }}
      />
    ) : (
      <PersonAvatar
        avatarUrl={item.avatarUrl}
        color={item.color}
        initials={initialsOf(item.name)}
        name={item.name}
        seed={item.colorSeed}
        size={18}
      />
    );
  // The busiest first; closed rooms last.
  const items = [...summary.items].sort(
    (a, b) =>
      Number(Boolean(a.closed)) - Number(Boolean(b.closed)) ||
      b.occupancy.percent - a.occupancy.percent,
  );
  return (
    <SummaryDrawer
      subtitle={period.replace(/^Tydzień /, "")}
      title={byRoom ? "Porównanie gabinetów" : "Porównanie specjalistów"}
    >
      <Figures
        items={weekFigures(occupancy, {
          visitsLabel: byRoom ? "Rezerwacje" : "Wizyty",
        })}
      />
      <Group
        title={
          byRoom
            ? "Gabinety, od najbardziej obłożonego"
            : "Specjaliści, od najbardziej obłożonego"
        }
      >
        <ul>
          {items.map((item) => (
            <li
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 border-b border-[var(--border)] px-3 py-2"
              key={item.id}
            >
              <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-medium text-[var(--text)]">
                {marker(item)}
                <span className="truncate">{item.name}</span>
              </span>
              {item.closed ? (
                <span className="rounded-[4px] bg-[var(--warning-soft)] px-1.5 text-[0.6875rem] font-medium text-[var(--warning-foreground)]">
                  Zamknięty
                </span>
              ) : (
                <span className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
                  <span
                    className={cn(
                      "font-semibold",
                      item.occupancy.overbooked
                        ? "text-[var(--danger)]"
                        : "text-[var(--text)]",
                    )}
                  >
                    {item.occupancy.percent}%
                  </span>{" "}
                  · {visitsLabel(item.occupancy.visitCount)} ·{" "}
                  {hoursShort(item.occupancy.bookedHours)} /{" "}
                  {hoursShort(item.occupancy.availableHours)}
                </span>
              )}
              {item.closed ? null : (
                <Bar
                  color={
                    byRoom
                      ? accent(item)
                      : barColor(
                          item.occupancy.percent,
                          item.occupancy.overbooked,
                        )
                  }
                  percent={item.occupancy.percent}
                />
              )}
            </li>
          ))}
        </ul>
      </Group>
    </SummaryDrawer>
  );
}

/** A specialist's own week summed up, and the next visits. */
export function PersonalSummaryPanel({
  summary,
  name,
  subtitle,
  visitHref,
  availabilityHref,
}: {
  summary: PersonalWeekView["summary"];
  name: string;
  subtitle: string | null;
  visitHref: (visitId: string) => string;
  /** Where the hours are set. */
  availabilityHref?: string;
}) {
  const { occupancy } = summary;
  return (
    <SummaryDrawer subtitle={subtitle} title={name}>
      <Figures items={weekFigures(occupancy)} />
      {availabilityHref ? (
        <div className="border-b border-[var(--border)] px-3 py-2">
          <Link
            className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--border)] px-2.5 text-[0.75rem] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={availabilityHref}
          >
            <CalendarCog aria-hidden="true" className="size-3.5" />
            Dostępność i nieobecności
          </Link>
        </div>
      ) : null}
      {summary.upcoming.length ? (
        <Group title="Najbliższe wizyty">
          <UpcomingVisitList
            upcoming={summary.upcoming}
            visitHref={visitHref}
          />
        </Group>
      ) : null}
    </SummaryDrawer>
  );
}
