import type { VisitDay } from "@repo/scheduling";
import { ChevronDown } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "./lib/utils";
import { EmptyState, StatusBadge } from "./portal-content";
import { resourceColors } from "./resource-colors";

// Visits by day in the portals (docs/product/booking-plan.md, R9): when,
// who, what and where, their state and (for the admin) the money; the
// client's contact under a disclosure. Server-rendered; a visit's action
// (e.g. the centre cancelling) comes in as an element, by the visit's id.

export interface VisitListProps {
  days: VisitDay[];
  /** Show who gives each visit (the admin's list of everyone's). */
  showSpecialist?: boolean;
  /** An action per visit id. */
  actions?: Record<string, ReactNode>;
  emptyTitle?: string;
  emptyText?: string;
}

export function VisitList({
  days,
  showSpecialist = false,
  actions = {},
  emptyTitle = "Brak wizyt",
  emptyText = "W tym okresie nie ma umówionych wizyt.",
}: VisitListProps) {
  if (days.length === 0) {
    return <EmptyState description={emptyText} title={emptyTitle} />;
  }
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section aria-labelledby={`dzien-${day.date}`} key={day.date}>
          <h2
            className="mb-2 text-sm font-semibold text-[var(--text-muted)] first-letter:uppercase"
            id={`dzien-${day.date}`}
          >
            {day.label}
          </h2>
          <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]">
            {day.visits.map((visit) => (
              <li
                className={cn(
                  "grid gap-3 border-l-4 border-l-[var(--visit-accent)] p-4 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-start",
                  visit.cancelled && "bg-[var(--bg)]",
                )}
                key={visit.id}
                style={
                  {
                    "--visit-accent": resourceColors(
                      visit.specialistColor,
                      visit.specialistId,
                    ).accent,
                  } as CSSProperties
                }
              >
                <p
                  className={cn(
                    "text-sm font-semibold text-[var(--text)] tabular-nums",
                    visit.cancelled && "text-[var(--text-muted)] line-through",
                  )}
                >
                  {visit.time}
                </p>
                <div className="min-w-0 space-y-1.5">
                  <p className="font-semibold text-[var(--text)]">
                    {visit.clientName}
                    <span className="font-normal text-[var(--text-muted)]">
                      {" "}
                      · {visit.serviceName}
                    </span>
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {[
                      showSpecialist ? visit.specialistName : null,
                      visit.place,
                      visit.reference,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge tone={visit.status.tone}>
                      {visit.status.label}
                    </StatusBadge>
                    {visit.payment ? (
                      <StatusBadge tone={visit.payment.tone}>
                        {visit.payment.label}
                      </StatusBadge>
                    ) : null}
                    {visit.note ? (
                      <StatusBadge dot={false} tone="info">
                        {visit.note}
                      </StatusBadge>
                    ) : null}
                  </div>
                  {visit.contact.length ? (
                    <details className="group text-sm">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded font-semibold text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none">
                        Dane klienta
                        <ChevronDown
                          aria-hidden="true"
                          className="size-4 transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr]">
                        {visit.contact.map((item) => (
                          <div className="contents" key={item.label}>
                            <dt className="text-[var(--text-muted)]">
                              {item.label}
                            </dt>
                            <dd className="break-words whitespace-pre-wrap text-[var(--text)]">
                              {item.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : null}
                </div>
                {actions[visit.id] ? (
                  <div className="sm:justify-self-end">{actions[visit.id]}</div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
