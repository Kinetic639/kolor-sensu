import type { ClientRow } from "@repo/scheduling";
import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../card";

// A client's card (docs/product/booking-plan.md, R15): how to reach them,
// their visits in numbers, and the centre's internal note (never shown to
// the client, nor to specialists). Their visits follow, below the card.

export interface ClientCardProps {
  row: ClientRow;
  cancelled: number;
  notes: string | null;
  /** The "Edytuj dane" button and its form. */
  edit?: ReactNode;
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-[var(--text)] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export function ClientCard({ row, cancelled, notes, edit }: ClientCardProps) {
  return (
    <Card className="space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="font-heading text-xl font-semibold text-[var(--text)]">
            {row.name}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">{row.since}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
            <li>
              <a
                className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                href={`mailto:${row.email}`}
              >
                <Mail aria-hidden="true" className="size-4" />
                {row.email}
              </a>
            </li>
            {row.phone ? (
              <li>
                <a
                  className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  href={`tel:${row.phone.replace(/\s+/g, "")}`}
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {row.phone}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        {edit}
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Wizyty" value={row.visits} />
        <Fact label="Nadchodzące" value={row.upcoming ?? "brak"} />
        <Fact label="Odwołane" value={cancelled} />
        <Fact label="Zapłacono" value={row.paid} />
        <Fact label="Ostatnia wizyta" value={row.lastVisit} />
        <Fact label="Najbliższa wizyta" value={row.nextVisit} />
      </dl>

      <section aria-labelledby="client-notes" className="space-y-1">
        <h3
          className="text-xs font-semibold text-[var(--text-muted)] uppercase"
          id="client-notes"
        >
          Notatka centrum
        </h3>
        <p className="text-sm whitespace-pre-wrap text-[var(--text)]">
          {notes ?? (
            <span className="text-[var(--text-muted)]">
              Brak notatki. Zobaczą ją tylko administratorzy.
            </span>
          )}
        </p>
      </section>
    </Card>
  );
}
