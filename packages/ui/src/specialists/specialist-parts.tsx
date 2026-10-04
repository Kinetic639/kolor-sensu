import type { CalendarPlace, UpcomingVisit, WeekDay } from "@repo/scheduling";
import { Video } from "lucide-react";
import {
  PersonAvatar,
  hoursShort,
  themeOf,
} from "../calendar-view/schedule-parts";
import { ROW_LINE } from "../detail-page/detail-page";
import { cn } from "../lib/utils";
import { resourceColors } from "../resource-colors";
import { PageLink as Link } from "../public-site/page-link";
import type { StripDay } from "../resource-roster/roster-parts";
import { Tag } from "../visit-table/visit-chips";
import { specialistTags } from "./params";
import type { SpecialistRow, SpecialistState } from "./types";

// The pieces a specialist is shown with, in the team's roster and on
// their page. Rendered on the server.

/**
 * Their picture or initials, in their colour; beside their name, so
 * hidden from screen readers (the name is said once).
 */
export function SpecialistAvatar({
  row,
  size = 26,
}: {
  row: Pick<SpecialistRow, "id" | "name" | "initials" | "avatarUrl" | "color">;
  size?: number;
}) {
  const accent = resourceColors(row.color, row.id).accent;
  return (
    // A ring in their colour, a thin gap of the surface inside it.
    <span
      aria-hidden="true"
      className="shrink-0 rounded-full"
      style={{
        boxShadow: `0 0 0 1.5px var(--surface), 0 0 0 3px ${accent}`,
      }}
    >
      <PersonAvatar
        avatarUrl={row.avatarUrl}
        color={row.color}
        initials={row.initials}
        name={row.name}
        seed={row.id}
        size={size}
      />
    </span>
  );
}

/** What their state tells (see specialistTags). */
export function SpecialistTags({
  state,
  withActive = false,
}: {
  state: SpecialistState;
  withActive?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {specialistTags(state, { withActive }).map((tag) => (
        <Tag key={tag.label} tone={tag.tone}>
          {tag.label}
        </Tag>
      ))}
    </span>
  );
}

/** A room with its colour, online with a camera. */
export function PlaceName({ place }: { place: CalendarPlace }) {
  const theme = themeOf(place);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {place.online ? (
        <Video
          aria-hidden="true"
          className="size-3.5 shrink-0"
          style={{ color: theme.accent }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-[3px]"
          style={{ background: theme.accent }}
        />
      )}
      <span className="truncate">{place.name}</span>
    </span>
  );
}

/** The week's days for the strip: each in the colour of its first room. */
export function stripDays(days: WeekDay[]): StripDay[] {
  return days.map((day) => {
    const shift = day.shifts[0];
    const where = day.shifts
      .map((one) => `${one.time} ${one.place.name}`)
      .join(", ");
    return {
      key: day.date,
      weekday: day.weekday,
      isToday: day.isToday,
      state: shift ? "on" : "off",
      color: shift ? themeOf(shift.place).accent : undefined,
      percent: day.percent,
      overbooked: day.overbooked,
      title: shift
        ? `${day.weekday} ${day.dateLabel}: ${where}, obłożenie ${day.percent}%`
        : `${day.weekday} ${day.dateLabel}: wolne`,
    };
  });
}

const HATCH =
  "bg-[repeating-linear-gradient(135deg,transparent_0_5px,color-mix(in_srgb,var(--text-subtle)_10%,transparent)_5px_6px)]";

/** Tydzień: the seven days side by side (on a phone, one under another). */
export function WeekDayTiles({ days }: { days: WeekDay[] }) {
  return (
    <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7 lg:gap-2">
      {days.map((day) => (
        <li
          aria-current={day.isToday ? "date" : undefined}
          className={cn(
            "grid min-w-0 content-start gap-1.5 rounded-[6px] border px-2.5 py-2 text-[0.75rem] lg:min-h-[6.5rem]",
            day.isToday
              ? "border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface))]"
              : cn(ROW_LINE, !day.shifts.length && HATCH),
          )}
          key={day.date}
        >
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--text)]">
            {day.weekday}
            <span className="text-[0.71875rem] font-normal text-[var(--text-muted)] tabular-nums">
              {day.dateLabel}
            </span>
            {day.isToday ? (
              <span className="ml-auto">
                <Tag tone="info">Dziś</Tag>
              </span>
            ) : null}
          </span>
          {day.shifts.length ? (
            <>
              {day.shifts.map((shift) => (
                <span
                  className="grid gap-px"
                  key={`${shift.time}-${shift.place.id}`}
                >
                  <span className="font-mono text-[0.71875rem] text-[var(--text)]">
                    {shift.time}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    <PlaceName place={shift.place} />
                  </span>
                </span>
              ))}
              <span className="mt-auto grid gap-1 pt-1">
                <span
                  aria-hidden="true"
                  className="block h-[5px] overflow-hidden rounded-full bg-[var(--surface-muted)]"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.min(100, day.percent)}%`,
                      background: day.overbooked
                        ? "var(--warning)"
                        : "var(--primary)",
                    }}
                  />
                </span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {hoursShort(day.bookedHours)} z{" "}
                  {hoursShort(day.availableHours)}
                </span>
              </span>
            </>
          ) : (
            <span className="text-[var(--text-muted)]">wolne</span>
          )}
        </li>
      ))}
    </ol>
  );
}

const TH =
  "h-7 border-b border-[var(--border)] pr-3 text-left text-[0.71875rem] font-medium whitespace-nowrap text-[var(--text-muted)]";
const TD = cn("h-9 border-b pr-3 align-middle whitespace-nowrap", ROW_LINE);

/** Najbliższe wizyty: a table, a value a column; each opens its booking. */
export function UpcomingVisitTable({
  visits,
  visitHref,
}: {
  visits: UpcomingVisit[];
  visitHref: (visitId: string) => string;
}) {
  if (!visits.length) {
    return (
      <p className="py-2 text-[0.8125rem] text-[var(--text-muted)]">
        Brak zaplanowanych wizyt.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-[0.8125rem] text-[var(--text)] [&_tr:last-child_td]:border-b-0">
        <caption className="sr-only">Najbliższe wizyty</caption>
        <thead>
          <tr>
            <th className={cn(TH, "w-24")} scope="col">
              Data
            </th>
            <th className={cn(TH, "w-28")} scope="col">
              Godzina
            </th>
            <th className={TH} scope="col">
              Klient
            </th>
            <th className={cn(TH, "hidden md:table-cell")} scope="col">
              Usługa
            </th>
            <th className={cn(TH, "hidden w-40 sm:table-cell")} scope="col">
              Gdzie
            </th>
            <th className={cn(TH, "hidden w-40 sm:table-cell")} scope="col">
              Stan
            </th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr key={visit.visitId}>
              <td className={cn(TD, "tabular-nums")}>
                <span className="font-semibold">
                  {visit.dateLabel.split(" ")[0]}
                </span>{" "}
                <span className="text-[var(--text-muted)]">
                  {visit.dateLabel.split(" ")[1]}
                </span>
              </td>
              <td className={cn(TD, "font-mono text-[0.75rem]")}>
                {visit.time}
              </td>
              <td className={cn(TD, "max-w-0 truncate font-semibold")}>
                <Link
                  className="rounded hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  href={visitHref(visit.visitId)}
                >
                  {visit.client}
                </Link>
              </td>
              <td
                className={cn(
                  TD,
                  "hidden max-w-0 truncate text-[var(--text-muted)] md:table-cell",
                )}
              >
                {visit.service}
              </td>
              <td
                className={cn(
                  TD,
                  "hidden text-[var(--text-muted)] sm:table-cell",
                )}
              >
                <PlaceName place={visit.place} />
              </td>
              <td className={cn(TD, "hidden sm:table-cell")}>
                <Tag tone={visit.pending ? "warning" : "success"}>
                  {visit.pending ? "Czeka na płatność" : "Potwierdzona"}
                </Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
