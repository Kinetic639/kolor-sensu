import {
  visitsLabel,
  type CalendarColumn,
  type CalendarWeekView,
} from "@repo/scheduling";
import { CalendarOff, ChevronDown, Clock, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import {
  OccupancyChip,
  PersonAvatar,
  PlaceMarker,
  themeOf,
} from "./schedule-parts";

// The calendar on a phone, after the reference's mobile views: a
// specialist, room or day per fold (open when it has visits), its
// availability as a calm banner and its visits as cards; the week as day
// buttons over the chosen day's list. Native <details>, so it works on
// the server and without JavaScript; the grids take over from md up.

function Fold({
  column,
  visitHref,
  availabilityHref,
  openVisitId,
  byRoom,
}: {
  column: CalendarColumn;
  visitHref: (visitId: string) => string;
  availabilityHref?: (key: string) => string;
  openVisitId?: string | null;
  byRoom: boolean;
}) {
  const person = column.kind === "specialist";
  const { occupancy } = column;
  return (
    <details
      className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
      data-unavailable={column.unavailable || undefined}
      open={
        column.visits.length > 0 || (column.isToday && column.kind === "day")
      }
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          {person ? (
            <PersonAvatar
              avatarUrl={column.avatarUrl}
              color={column.color}
              initials={column.initials}
              muted={column.unavailable}
              name={column.title}
              seed={column.colorSeed}
            />
          ) : column.kind === "day" ? null : (
            <PlaceMarker column={column} />
          )}
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-[var(--text)]">
                {column.title}
                {column.kind === "day" ? `, ${column.subtitle}` : ""}
              </span>
              <OccupancyChip
                occupancy={occupancy}
                unavailable={column.unavailable}
              />
            </span>
            {person && column.subtitle ? (
              <span className="block truncate text-[0.6875rem] text-[var(--text-muted)]">
                {column.subtitle}
              </span>
            ) : null}
            <span className="block text-[0.625rem] text-[var(--text-subtle)] tabular-nums">
              {column.closed
                ? column.closed
                : column.hours
                  ? `${column.hours} · ${visitsLabel(occupancy.visitCount)}`
                  : "Brak dostępności"}
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-[var(--text-subtle)] transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-2 border-t border-[var(--border)] p-3">
        {column.availability.map((slot) => {
          const theme = themeOf(slot.place);
          const content = (
            <>
              <span className="font-semibold tabular-nums">
                {byRoom ? "Otwarte" : "Okno"}: {slot.time}
              </span>
              {byRoom ? null : (
                <span className="text-[0.625rem] font-semibold tracking-wider uppercase opacity-80">
                  {slot.place.name}
                </span>
              )}
            </>
          );
          const bannerClass =
            "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[0.6875rem]";
          const bannerStyle = {
            backgroundColor: theme.availBg,
            borderColor: theme.availBorder,
            color: theme.text,
          };
          const href = availabilityHref?.(slot.key);
          return href ? (
            <Link
              aria-label={`${slot.label}: szczegóły`}
              className={cn(
                bannerClass,
                "transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
              )}
              data-availability=""
              href={href}
              key={slot.key}
              scroll={false}
              style={bannerStyle}
            >
              {content}
            </Link>
          ) : (
            <p
              className={bannerClass}
              data-availability=""
              key={slot.key}
              style={bannerStyle}
            >
              {content}
            </p>
          );
        })}
        {column.blocked.map((slot) => (
          <p
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[0.6875rem] text-[var(--text-muted)]"
            key={slot.key}
          >
            <Clock aria-hidden="true" className="size-3 shrink-0" />
            <span className="font-semibold tabular-nums">{slot.time}</span>
            {slot.label}
          </p>
        ))}
        {column.visits.length ? (
          <ul className="space-y-2">
            {column.visits.map((slot) => {
              const theme = themeOf(slot.place);
              return (
                <li data-visit="" key={slot.key}>
                  <Link
                    aria-current={
                      slot.visitId === openVisitId ? "true" : undefined
                    }
                    aria-label={slot.label}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-lg border border-l-4 p-2.5 shadow-sm transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                      slot.pending && "border-dashed",
                      slot.dimmed && "opacity-35",
                      slot.visitId === openVisitId &&
                        "ring-2 ring-[var(--text)] ring-offset-1",
                    )}
                    href={visitHref(slot.visitId)}
                    scroll={false}
                    style={{
                      backgroundColor: slot.pending
                        ? "var(--warning-soft)"
                        : theme.cardBg,
                      borderColor: theme.cardBorder,
                      borderLeftColor: theme.accent,
                      color: theme.text,
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.6875rem] font-bold tabular-nums">
                        {slot.time} ({slot.minutes} min)
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-bold">
                        {slot.client}
                      </span>
                      <span
                        className="block truncate text-[0.6875rem]"
                        style={{ color: theme.textMuted }}
                      >
                        {slot.service}
                        {byRoom ? ` · ${slot.person.name}` : ""}
                      </span>
                      {slot.pending ? (
                        <span className="mt-0.5 block text-[0.625rem] font-semibold text-[var(--warning-foreground)]">
                          Czeka na płatność
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-sm bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-1.5 py-0.5 text-[0.5625rem] font-semibold">
                      {slot.place.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="flex items-center justify-center gap-1.5 py-2 text-xs text-[var(--text-subtle)] italic">
            {column.closed ? (
              <Lock aria-hidden="true" className="size-3" />
            ) : (
              <CalendarOff aria-hidden="true" className="size-3" />
            )}
            {column.closed ?? "Brak zaplanowanych wizyt"}
          </p>
        )}
      </div>
    </details>
  );
}

export interface ScheduleAgendaProps {
  columns: CalendarColumn[];
  byRoom?: boolean;
  visitHref: (visitId: string) => string;
  availabilityHref?: (key: string) => string;
  openVisitId?: string | null;
  ariaLabel: string;
  empty?: string;
}

/** A day (or a specialist's week) on a phone: one fold per column. */
export function ScheduleAgenda({
  columns,
  byRoom = false,
  visitHref,
  availabilityHref,
  openVisitId,
  ariaLabel,
  empty = "Nic do pokazania.",
}: ScheduleAgendaProps) {
  if (!columns.length) {
    return (
      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-xs text-[var(--text-subtle)]">
        {empty}
      </p>
    );
  }
  return (
    <section aria-label={ariaLabel} className="space-y-2.5">
      {columns.map((column) => (
        <Fold
          availabilityHref={availabilityHref}
          byRoom={byRoom}
          column={column}
          key={column.key}
          openVisitId={openVisitId}
          visitHref={visitHref}
        />
      ))}
    </section>
  );
}

/** The week on a phone: a button per day, then that day's list. */
export function WeekAgenda({
  view,
  selected,
  dayHref,
  byRoom,
  visitHref,
  availabilityHref,
  openVisitId,
  ariaLabel,
}: {
  view: CalendarWeekView;
  /** The chosen day (else today, else the first). */
  selected: string;
  dayHref: (date: string) => string;
  byRoom: boolean;
  visitHref: (visitId: string) => string;
  availabilityHref?: (key: string) => string;
  openVisitId?: string | null;
  ariaLabel: string;
}) {
  const day =
    view.days.find((one) => one.date === selected) ??
    view.days.find((one) => one.isToday) ??
    view.days[0];
  return (
    <section aria-label={ariaLabel} className="space-y-4">
      <nav aria-label="Dzień tygodnia">
        <ul className="flex gap-1.5 overflow-x-auto pb-1">
          {view.days.map((one) => {
            const active = one.date === day?.date;
            const [weekday, number] = one.label.split(", ");
            return (
              <li key={one.date}>
                <Link
                  aria-current={active ? "date" : undefined}
                  className={cn(
                    "flex min-w-14 flex-col items-center rounded-xl border px-2 py-2 text-center transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-subtle)]",
                  )}
                  href={dayHref(one.date)}
                  scroll={false}
                >
                  <span
                    className={cn(
                      "text-[0.625rem] font-semibold uppercase",
                      active ? undefined : "text-[var(--text-muted)]",
                    )}
                  >
                    {weekday}
                  </span>
                  <span className="mt-0.5 text-sm font-bold tabular-nums">
                    {number}
                  </span>
                  {one.occupancy.visitCount ? (
                    <span
                      className={cn(
                        "mt-1 rounded-full px-1 text-[0.5625rem]",
                        active
                          ? "bg-[var(--surface)] font-semibold text-[var(--primary)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                      )}
                    >
                      {one.occupancy.visitCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {day ? (
        <>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
            <div>
              <h3 className="text-xs font-bold text-[var(--text)]">
                {day.label}
                {day.isToday ? " · dziś" : ""}
              </h3>
              <p className="text-[0.6875rem] text-[var(--text-muted)]">
                {byRoom
                  ? "Porównanie rezerwacji sal"
                  : "Porównanie obłożenia grafików"}
              </p>
            </div>
            <span className="text-right">
              <span className="block text-[0.625rem] font-semibold text-[var(--text-subtle)] uppercase">
                Dzień ogółem
              </span>
              <span className="text-xs font-bold tabular-nums">
                {day.occupancy.percent}% (
                {visitsLabel(day.occupancy.visitCount)})
              </span>
            </span>
          </div>
          <ScheduleAgenda
            ariaLabel={day.label}
            availabilityHref={availabilityHref}
            byRoom={byRoom}
            columns={day.lanes}
            empty={
              byRoom
                ? "Brak dostępnych gabinetów w tym dniu."
                : "Brak aktywnych specjalistów w tym dniu."
            }
            openVisitId={openVisitId}
            visitHref={visitHref}
          />
        </>
      ) : null}
    </section>
  );
}
