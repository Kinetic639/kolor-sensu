import {
  visitsLabel,
  type AvailabilitySlot,
  type CalendarColumn,
} from "@repo/scheduling";
import { CalendarCog, Clock, MapPin, Video, X } from "lucide-react";
import type { ReactNode } from "react";
import { PageLink as Link } from "../public-site/page-link";
import { ClosePanelOnEscape } from "../visit-table/visit-panel-escape";
import { hoursShort, PersonAvatar, themeOf } from "./schedule-parts";

// An availability window open beside the calendar (?okno=…), after the
// reference's details modal: whose it is (or which room's hours), where
// and when, how long, the visits booked in it, and a way to change it.

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 text-[var(--text)]">{children}</dd>
    </div>
  );
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} godz.` : null, rest ? `${rest} min` : null]
    .filter(Boolean)
    .join(" ");
}

export function AvailabilityPanel({
  slot,
  column,
  dateLabel,
  closeHref,
  visitHref,
  manage,
}: {
  slot: AvailabilitySlot;
  column: CalendarColumn;
  /** `czwartek, 1 października 2026` */
  dateLabel: string;
  closeHref: string;
  visitHref: (visitId: string) => string;
  /** Where the window is changed (e.g. the specialist's availability). */
  manage?: { href: string; label: string };
}) {
  const theme = themeOf(slot.place);
  const person = column.kind === "specialist" || column.kind === "day";
  const inside = column.visits.filter(
    (visit) => visit.start < slot.end && visit.end > slot.start,
  );
  const booked = inside.reduce(
    (sum, visit) =>
      sum + Math.min(visit.end, slot.end) - Math.max(visit.start, slot.start),
    0,
  );
  const length = slot.end - slot.start;
  return (
    <aside
      aria-labelledby="okno-panel-tytul"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-overlay)] xl:static xl:z-auto xl:w-96 xl:max-w-none xl:shrink-0 xl:shadow-none"
    >
      <ClosePanelOnEscape href={closeHref} />
      <header
        className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-3.5 pt-2.5 pb-2"
        style={{ backgroundColor: theme.availBg }}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[5px] text-white [&_svg]:size-3"
            style={{ backgroundColor: theme.solid }}
          >
            {slot.place.online ? (
              <Video className="size-4" />
            ) : (
              <MapPin className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[0.75rem] text-[var(--text-muted)]">
              {person
                ? `Dostępność: ${column.kind === "day" ? `${column.title}, ${column.subtitle}` : column.title}`
                : `Godziny otwarcia: ${column.title}`}
            </p>
            <h2
              className="text-[0.9375rem] leading-tight font-semibold text-[var(--text)]"
              id="okno-panel-tytul"
            >
              {slot.place.online ? "Dostępność online" : slot.place.name}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] font-semibold tabular-nums">
              {slot.time}
            </p>
          </div>
        </div>
        <Link
          aria-label="Zamknij szczegóły dostępności"
          className="-mr-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={closeHref}
          scroll={false}
        >
          <X aria-hidden="true" className="size-4" />
        </Link>
      </header>
      <div className="flex-1 space-y-3.5 overflow-y-auto px-3.5 py-3 text-[0.8125rem]">
        <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-2 gap-y-1.5">
          <Row label="Dzień">{dateLabel}</Row>
          <Row label="Godziny">
            <span className="tabular-nums">
              {slot.time} ({duration(length)})
            </span>
          </Row>
          <Row label="Miejsce">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
              {slot.place.online ? "Online" : slot.place.name}
            </span>
          </Row>
          <Row label="Zajęte">
            <span className="tabular-nums">
              {visitsLabel(inside.length)} ·{" "}
              {hoursShort(Math.round((booked / 60) * 10) / 10)} z{" "}
              {hoursShort(Math.round((length / 60) * 10) / 10)}
            </span>
          </Row>
        </dl>

        {column.kind === "specialist" ? (
          <section className="flex items-center gap-2.5 border-y border-[var(--border)] py-2">
            <PersonAvatar
              avatarUrl={column.avatarUrl}
              color={column.color}
              initials={column.initials}
              name={column.title}
              seed={column.colorSeed}
            />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-[var(--text)]">
                {column.title}
              </span>
              {column.subtitle ? (
                <span className="block truncate text-xs text-[var(--text-muted)]">
                  {column.subtitle}
                </span>
              ) : null}
            </span>
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-[0.6875rem] font-semibold tracking-[0.03em] text-[var(--text-muted)]">
            Wizyty w tym oknie
          </h3>
          {inside.length ? (
            <ul className="space-y-1">
              {inside.map((visit) => {
                const visitTheme = themeOf(visit.place);
                return (
                  <li key={visit.key}>
                    <Link
                      className="flex items-center justify-between gap-2 rounded-[5px] px-2.5 py-1.5 transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                      href={visitHref(visit.visitId)}
                      scroll={false}
                      style={{
                        backgroundColor: visitTheme.cardBg,
                        boxShadow: `inset 3px 0 0 ${visitTheme.accent}`,
                        color: visitTheme.text,
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[0.65625rem] tabular-nums opacity-80">
                          {visit.time}
                        </span>
                        <span className="block truncate font-semibold">
                          {visit.client}
                        </span>
                      </span>
                      <span className="truncate text-xs">{visit.service}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-[var(--text-subtle)]">
              <Clock aria-hidden="true" className="size-3.5" />
              Całe okno jest wolne.
            </p>
          )}
        </section>
      </div>
      {manage ? (
        <footer className="border-t border-[var(--border)] p-3">
          <Link
            className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={manage.href}
          >
            <CalendarCog aria-hidden="true" className="size-3.5" />
            {manage.label}
          </Link>
        </footer>
      ) : null}
    </aside>
  );
}
