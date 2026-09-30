import type { VisitEventRow, VisitRow, VisitTone } from "@repo/scheduling";
import { Mail, Phone, X } from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton, IconLink } from "../icon-action";
import { cn } from "../lib/utils";
import { LinkTabs } from "../link-tabs";
import { PageLink as Link } from "../public-site/page-link";
import { resourceColors } from "../resource-colors";
import { ClosePanelOnEscape } from "./visit-panel-escape";

// The visit open from the bookings table (?wizyta=…), beside it on a wide
// screen and over it on a narrow one. Tabs (in the address, ?karta=…): the
// details (when, who, where, the client's contact, the money for admins)
// and the history (every event from the hold on: statuses, moves,
// payments, e-mails). A toolbar of icon actions at the bottom. Rendered on
// the server; it closes with a link (or Escape).

export type VisitPanelTab = "szczegoly" | "historia";

const TONE_DOT: Record<VisitTone, string> = {
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--text-subtle)]",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--border)] px-4 py-3 first:border-t-0">
      <h3 className="mb-2 text-xs font-semibold tracking-[0.04em] text-[var(--text-muted)] uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[0.8125rem]">
      {items.map(([label, value]) => (
        <div className="contents" key={label}>
          <dt className="text-[var(--text-muted)]">{label}</dt>
          <dd className="min-w-0 break-words text-[var(--text)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A value with its icon actions beside it (call, copy). */
function WithActions({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="min-w-0 flex-1 truncate" title={value}>
        {value}
      </span>
      <span className="-my-1 flex shrink-0 items-center">{children}</span>
    </span>
  );
}

function Details({ row }: { row: VisitRow }) {
  const accent = resourceColors(row.specialistColor, row.specialistId).accent;
  return (
    <>
      <Section title="Wizyta">
        <Facts
          items={[
            [
              "Termin",
              <span className="tabular-nums" key="termin">
                {row.weekday}, {row.dateLabel}, {row.time}
              </span>,
            ],
            ["Usługa", row.serviceName],
            [
              "Specjalista",
              <span className="inline-flex items-center gap-1.5" key="kto">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: accent }}
                />
                {row.specialistName}
              </span>,
            ],
            ["Miejsce", row.place],
          ]}
        />
      </Section>

      <Section title="Klient">
        <Facts
          items={[
            ["Imię i nazwisko", row.clientName],
            [
              "Telefon",
              row.phone ? (
                <WithActions key="tel" value={row.phone}>
                  <IconLink
                    href={`tel:${row.phone.replace(/\s/g, "")}`}
                    icon={<Phone aria-hidden="true" />}
                    label="Zadzwoń"
                  />
                  <CopyButton label="Kopiuj numer telefonu" value={row.phone} />
                </WithActions>
              ) : (
                "—"
              ),
            ],
            [
              "E-mail",
              row.email ? (
                <WithActions key="mail" value={row.email}>
                  <IconLink
                    href={`mailto:${row.email}`}
                    icon={<Mail aria-hidden="true" />}
                    label="Napisz e-mail"
                  />
                  <CopyButton label="Kopiuj adres e-mail" value={row.email} />
                </WithActions>
              ) : (
                "—"
              ),
            ],
            ...(row.notes ? [["Uwagi", row.notes] as [string, ReactNode]] : []),
          ]}
        />
      </Section>

      {row.payment ? (
        <Section title="Płatność">
          <Facts
            items={[
              [
                "Status",
                <span className="inline-flex items-center gap-1.5" key="p">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      TONE_DOT[row.payment.tone],
                    )}
                  />
                  {row.payment.label}
                </span>,
              ],
              [row.cancelled ? "Do zwrotu" : "Kwota", row.amount],
            ]}
          />
        </Section>
      ) : null}
    </>
  );
}

/** Every event, oldest first, on a line. */
function History({ events }: { events: VisitEventRow[] }) {
  if (!events.length) {
    return (
      <p className="px-4 py-6 text-[0.8125rem] text-[var(--text-muted)]">
        Brak zapisanych zdarzeń.
      </p>
    );
  }
  return (
    <ol aria-label="Historia rezerwacji" className="px-4 py-3">
      {events.map((event, index) => (
        <li className="relative flex gap-3 pb-4 last:pb-0" key={event.id}>
          {index < events.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-0 left-[4px] w-px bg-[var(--border)]"
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              "relative mt-1.5 size-2.5 shrink-0 rounded-full ring-2 ring-[var(--surface)]",
              TONE_DOT[event.tone],
            )}
          />
          <div className="min-w-0 text-[0.8125rem]">
            <p className="font-semibold text-[var(--text)]">{event.title}</p>
            {event.detail ? (
              <p className="text-[var(--text)]">{event.detail}</p>
            ) : null}
            <p className="text-xs text-[var(--text-muted)] tabular-nums">
              {event.when} · {event.actor}
              {event.restored ? " · odtworzone z danych" : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function VisitPanel({
  row,
  tabs,
  tab,
  events,
  closeHref,
  toolbar,
}: {
  row: VisitRow;
  /** The tabs' links (the table's address with each tab). */
  tabs: { key: VisitPanelTab; label: string; href: string }[];
  tab: VisitPanelTab;
  /** The history, for its tab. */
  events: VisitEventRow[] | null;
  /** The table's address without the panel. */
  closeHref: string;
  /** Icon actions of the visit (e.g. cancelling), in the bottom toolbar. */
  toolbar?: ReactNode;
}) {
  return (
    <aside
      aria-labelledby="wizyta-panel-tytul"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-xl xl:sticky xl:top-4 xl:z-auto xl:max-h-[calc(100dvh-7rem)] xl:w-[28rem] xl:shrink-0 xl:rounded-[var(--radius-surface)] xl:border xl:shadow-[var(--shadow-surface)]"
    >
      <ClosePanelOnEscape href={closeHref} />
      <header className="shrink-0 border-b border-[var(--border)] px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
              {row.reference}
            </p>
            <h2
              className="text-lg leading-tight font-semibold text-[var(--text)]"
              id="wizyta-panel-tytul"
            >
              {row.clientName}
            </h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem]">
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", TONE_DOT[row.status.tone])}
              />
              {row.status.label}
              {row.note ? (
                <span className="text-[var(--info)]"> · przełożona</span>
              ) : null}
            </p>
          </div>
          <Link
            aria-label="Zamknij szczegóły wizyty"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={closeHref}
            scroll={false}
          >
            <X aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <LinkTabs
          ariaLabel="Sekcje rezerwacji"
          className="mt-2"
          items={tabs.map((one) => ({
            key: one.key,
            label: one.label,
            href: one.href,
            active: one.key === tab,
          }))}
          linkAs={Link}
          variant="underline"
        />
      </header>

      {/* Only the tab scrolls, inside the panel (never the page under it);
          the header and the toolbar stay in view. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "historia" ? (
          <History events={events ?? []} />
        ) : (
          <Details row={row} />
        )}
      </div>

      <div
        aria-label="Akcje rezerwacji"
        className="flex shrink-0 items-center gap-1 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        role="toolbar"
      >
        <CopyButton label="Kopiuj numer rezerwacji" value={row.reference} />
        {toolbar}
      </div>
    </aside>
  );
}
