import {
  visitsLabel,
  type ComparisonSummary,
  type PersonalWeekView,
} from "@repo/scheduling";
import { Calendar, CalendarCog, Clock, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { scheduleTheme } from "../resource-colors";
import { SummaryCloseButton } from "./schedule-controls";
import {
  hoursShort,
  OccupancyRing,
  PersonAvatar,
  themeOf,
} from "./schedule-parts";

// The panels beside the calendar, after the reference: the week compared
// (the centre's visits and occupancy, the busiest and the quietest, each
// specialist or room), and a specialist's own week (occupancy, hours, the
// next visits). Hidden with the "Podsumowanie" switch.

function Panel({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label={title}
      className="hidden w-72 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-subtle)] lg:flex xl:w-80"
      data-summary=""
    >
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] p-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[0.625rem] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="truncate text-xs font-bold text-[var(--text)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate text-[0.6875rem] text-[var(--text-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <SummaryCloseButton />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}

function Metric({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <p className="text-[0.625rem] font-semibold text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-bold tabular-nums",
          accent ? "text-[var(--primary)]" : "text-[var(--text)]",
        )}
      >
        {value}
      </p>
      <p className="text-[0.625rem] text-[var(--text-subtle)]">{note}</p>
    </div>
  );
}

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
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
        className="size-3 shrink-0 rounded-full shadow-sm"
        style={{
          backgroundColor: scheduleTheme(
            item.color,
            item.colorSeed,
            item.id === "online",
          ).accent,
        }}
      />
    ) : (
      <PersonAvatar
        avatarUrl={item.avatarUrl}
        color={item.color}
        initials={item.name
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
        name={item.name}
        seed={item.colorSeed}
        size={20}
      />
    );
  return (
    <Panel
      subtitle={period}
      title={byRoom ? "Porównanie gabinetów" : "Porównanie specjalistów"}
    >
      <div className="grid grid-cols-2 gap-2">
        <Metric
          label={byRoom ? "Rezerwacje sal" : "Wizyty kliniki"}
          note="w całym tygodniu"
          value={String(summary.visitCount)}
        />
        <Metric
          accent
          label={byRoom ? "Utylizacja sal" : "Średnie obłożenie"}
          note={`${hoursShort(occupancy.bookedHours)} z ${hoursShort(occupancy.availableHours)}`}
          value={`${occupancy.percent}%`}
        />
      </div>

      <section className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-[0.6875rem] font-bold text-[var(--text)]">
          <Clock
            aria-hidden="true"
            className="size-3.5 text-[var(--text-muted)]"
          />
          {byRoom ? "Wolna pojemność gabinetów" : "Pojemność grafików"}
        </h3>
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-2 text-[var(--text-muted)]">
            <dt>{byRoom ? "Czas zajętości:" : "Zarezerwowany czas:"}</dt>
            <dd className="font-semibold text-[var(--text)] tabular-nums">
              {hoursShort(occupancy.bookedHours)}
            </dd>
          </div>
          <div className="flex justify-between gap-2 text-[var(--text-muted)]">
            <dt>{byRoom ? "Wolny czas gabinetów:" : "Wolne okna:"}</dt>
            <dd className="font-semibold text-[var(--primary)] tabular-nums">
              {hoursShort(occupancy.freeHours)}
            </dd>
          </div>
        </dl>
        <span className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-[var(--primary-soft)]">
          <span
            className="h-full bg-[var(--primary)]"
            style={{ width: `${Math.min(100, occupancy.percent)}%` }}
          />
        </span>
      </section>

      {summary.highest ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[0.6875rem] font-bold text-[var(--text)]">
            <TrendingUp
              aria-hidden="true"
              className="size-3.5 text-[var(--text-muted)]"
            />
            {byRoom
              ? "Najbardziej i najmniej obciążone"
              : "Wskaźniki obłożenia"}
          </h3>
          {[
            { item: summary.highest, label: "Najwyższe", high: true },
            ...(summary.lowest && summary.lowest.id !== summary.highest.id
              ? [{ item: summary.lowest, label: "Najniższe", high: false }]
              : []),
          ].map(({ item, label, high }) => (
            <div
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs",
                high
                  ? "border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)]"
                  : "border-[var(--border)] bg-[var(--surface)]",
              )}
              key={label}
            >
              <span className="flex min-w-0 items-center gap-2">
                {marker(item)}
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[0.625rem] font-semibold uppercase",
                      high
                        ? "text-[var(--primary)]"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {label} {byRoom ? "obciążenie" : "obłożenie"}
                  </span>
                  <span className="block truncate font-bold text-[var(--text)]">
                    {item.name}
                  </span>
                </span>
              </span>
              <span className="shrink-0 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-bold tabular-nums shadow-sm">
                {item.percent}%
              </span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-2 border-t border-[var(--border)] pt-3">
        <h3 className="text-[0.6875rem] font-bold text-[var(--text)]">
          {byRoom
            ? "Obłożenie poszczególnych gabinetów"
            : "Obłożenie wg specjalisty"}
        </h3>
        <ul className="space-y-2">
          {summary.items.map((item) => (
            <li
              className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
              key={item.id}
            >
              <span className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  {byRoom ? marker(item) : null}
                  <span className="truncate font-semibold text-[var(--text)]">
                    {item.name}
                  </span>
                </span>
                {item.closed ? (
                  <span className="rounded border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-1.5 text-[0.625rem] font-medium text-[var(--warning-foreground)]">
                    Zamknięty
                  </span>
                ) : (
                  <span className="text-[0.625rem] font-bold tabular-nums">
                    {item.occupancy.percent}%
                  </span>
                )}
              </span>
              {item.closed ? null : (
                <>
                  <Bar
                    color={
                      byRoom
                        ? scheduleTheme(
                            item.color,
                            item.colorSeed,
                            item.id === "online",
                          ).accent
                        : barColor(
                            item.occupancy.percent,
                            item.occupancy.overbooked,
                          )
                    }
                    percent={item.occupancy.percent}
                  />
                  <span className="flex justify-between text-[0.625rem] text-[var(--text-subtle)]">
                    <span>{visitsLabel(item.occupancy.visitCount)}</span>
                    <span className="tabular-nums">
                      {hoursShort(item.occupancy.bookedHours)} /{" "}
                      {hoursShort(item.occupancy.availableHours)}
                    </span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Panel>
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
    <Panel eyebrow="Podsumowanie tygodnia" subtitle={subtitle} title={name}>
      <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm">
        <OccupancyRing occupancy={occupancy} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.6875rem] font-semibold text-[var(--text)]">
            Obłożenie czasu pracy
          </p>
          <p className="text-[0.625rem] text-[var(--text-muted)] tabular-nums">
            {hoursShort(occupancy.bookedHours)} z{" "}
            {hoursShort(occupancy.availableHours)}
          </p>
          <p
            className={cn(
              "truncate text-[0.5625rem] font-medium",
              occupancy.overbooked
                ? "text-[var(--warning-foreground)]"
                : "text-[var(--primary)]",
            )}
          >
            {occupancy.overbooked
              ? "Przeciążenie dostępności"
              : occupancy.freeHours > 0
                ? `${hoursShort(occupancy.freeHours)} wolnych`
                : "Pełne wykorzystanie"}
          </p>
        </div>
      </div>
      <dl className="space-y-1 text-xs">
        {[
          {
            icon: <Calendar aria-hidden="true" className="size-3" />,
            label: "Liczba wizyt",
            value: String(summary.visitCount),
          },
          {
            icon: <Clock aria-hidden="true" className="size-3" />,
            label: "Zarezerwowane",
            value: hoursShort(occupancy.bookedHours),
          },
          {
            icon: (
              <Clock
                aria-hidden="true"
                className="size-3 text-[var(--primary)]"
              />
            ),
            label: "Pozostało wolnych",
            value: hoursShort(occupancy.freeHours),
          },
        ].map((row) => (
          <div
            className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5"
            key={row.label}
          >
            <dt className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--text-muted)]">
              {row.icon}
              {row.label}
            </dt>
            <dd className="font-semibold text-[var(--text)] tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {availabilityHref ? (
        <Link
          className="flex items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] px-2 py-1.5 text-[0.6875rem] font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={availabilityHref}
        >
          <CalendarCog aria-hidden="true" className="size-3.5" />
          Dostępność i nieobecności
        </Link>
      ) : null}
      {summary.upcoming.length ? (
        <section className="space-y-1 border-t border-[var(--border)] pt-2">
          <h3 className="text-[0.625rem] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
            Najbliższe wizyty
          </h3>
          <ul className="space-y-1">
            {summary.upcoming.map((slot) => {
              const theme = themeOf(slot.place);
              return (
                <li key={slot.key}>
                  <Link
                    className="block rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5 text-xs transition-colors hover:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    href={visitHref(slot.visitId)}
                    scroll={false}
                  >
                    <span className="flex items-center justify-between gap-1 text-[0.625rem]">
                      <span className="font-semibold text-[var(--text)] tabular-nums">
                        {slot.day}, {slot.time}
                      </span>
                      <span
                        className="shrink-0 rounded-sm px-1 text-[0.5625rem] font-semibold"
                        style={{
                          backgroundColor: theme.cardBg,
                          color: theme.text,
                        }}
                      >
                        {slot.place.name}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.6875rem] font-medium text-[var(--text)]">
                      {slot.client}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Panel>
  );
}
