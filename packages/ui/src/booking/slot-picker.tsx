import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// The "Termin" step: a week of free visit times (list_free_slots). Only free
// times are shown, never taken ones: nobody learns when others have visits.
// Each time is a link setting it in the address; the page holds it when the
// client goes on. Wide screens: days side by side, the hours lined up in
// rows; phones: the days one under another.

export interface SlotPickerSlot {
  /** Local `HH:MM`. */
  time: string;
  href: string;
  selected?: boolean;
}

export interface SlotPickerDay {
  date: string;
  /** "Pon." */
  weekday: string;
  /** "14 kwietnia" */
  label: string;
  /** For screen readers: "poniedziałek, 14 kwietnia". */
  fullLabel: string;
  slots: SlotPickerSlot[];
}

export interface SlotPickerProps {
  days: SlotPickerDay[];
  /** "14–20 kwietnia 2025" */
  weekLabel: string;
  /** Null: no earlier week (it is this week). */
  previousHref?: string | null;
  /** Null: beyond the booking horizon. */
  nextHref?: string | null;
}

function WeekLink({
  href,
  direction,
}: {
  href: string | null | undefined;
  direction: "previous" | "next";
}) {
  const label =
    direction === "previous" ? "Poprzedni tydzień" : "Następny tydzień";
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const className =
    "rounded-button border-border text-small inline-flex h-10 items-center gap-1.5 border px-3 font-semibold";
  const content = (
    <>
      {direction === "previous" ? (
        <Icon aria-hidden="true" className="size-4" />
      ) : null}
      <span className="max-sm:sr-only">{label}</span>
      {direction === "next" ? (
        <Icon aria-hidden="true" className="size-4" />
      ) : null}
    </>
  );
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={cn(className, "text-text-muted/60 cursor-not-allowed")}
      >
        {content}
      </span>
    );
  }
  return (
    <Link
      aria-label={label}
      className={cn(
        className,
        "bg-surface text-ink hover:border-border-strong focus-visible:outline-ring focus-visible:outline-2",
      )}
      href={href}
    >
      {content}
    </Link>
  );
}

function SlotLink({
  day,
  slot,
  className,
}: {
  day: SlotPickerDay;
  slot: SlotPickerSlot;
  className?: string;
}) {
  return (
    <Link
      aria-current={slot.selected ? "true" : undefined}
      aria-label={`${day.fullLabel}, ${slot.time}`}
      className={cn(
        "text-small focus-visible:outline-ring flex h-9 items-center justify-center rounded-lg font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        slot.selected
          ? "bg-primary text-on-primary"
          : "bg-primary-soft text-primary-strong hover:bg-primary hover:text-on-primary",
        className,
      )}
      href={slot.href}
    >
      {slot.time}
    </Link>
  );
}

export function SlotPicker({
  days,
  weekLabel,
  previousHref,
  nextHref,
}: SlotPickerProps) {
  // The rows: every hour that has a free time on some day.
  const times = [
    ...new Set(days.flatMap((day) => day.slots.map((slot) => slot.time))),
  ].sort();

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <WeekLink direction="previous" href={previousHref} />
        <p className="text-small text-ink text-center">
          <span className="sr-only">Tydzień: </span>
          <span className="font-semibold">{weekLabel}</span>
        </p>
        <WeekLink direction="next" href={nextHref} />
      </div>

      {times.length === 0 ? (
        <p className="rounded-card-sm bg-bg text-small text-text-muted p-6 text-center">
          W tym tygodniu nie ma wolnych terminów.
        </p>
      ) : (
        <>
          {/* Wide screens: the week side by side. */}
          <div
            className="hidden gap-2 md:grid"
            data-testid="slot-week"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => {
              const byTime = new Map(
                day.slots.map((slot) => [slot.time, slot]),
              );
              return (
                <section
                  aria-label={day.fullLabel}
                  className="grid content-start gap-1.5"
                  data-day={day.date}
                  key={day.date}
                >
                  <h3
                    aria-hidden="true"
                    className="text-small mb-1 text-center"
                  >
                    <span className="text-ink block font-semibold">
                      {day.weekday}
                    </span>
                    <span className="text-text-muted">{day.label}</span>
                  </h3>
                  {times.map((time) => {
                    const slot = byTime.get(time);
                    return (
                      <div data-slot-row={time} key={time}>
                        {slot ? (
                          <SlotLink day={day} slot={slot} />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="text-text-muted/50 flex h-9 items-center justify-center"
                          >
                            –
                          </span>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>

          {/* Phones: one day under another. */}
          <div className="grid gap-4 md:hidden" data-testid="slot-agenda">
            {days.map((day) => (
              <section aria-label={day.fullLabel} key={day.date}>
                <h3 aria-hidden="true" className="text-small text-ink mb-2">
                  <span className="font-semibold">{day.weekday}</span>{" "}
                  <span className="text-text-muted">{day.label}</span>
                </h3>
                {day.slots.length ? (
                  <ul className="grid grid-cols-4 gap-2">
                    {day.slots.map((slot) => (
                      <li key={slot.time}>
                        <SlotLink day={day} slot={slot} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-small text-text-muted">
                    Brak wolnych terminów
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      <ul
        className="text-small text-text-muted flex gap-4"
        aria-label="Legenda"
      >
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-primary-soft size-3 rounded" />
          Wolny termin
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-primary size-3 rounded" />
          Wybrany termin
        </li>
      </ul>
    </div>
  );
}
