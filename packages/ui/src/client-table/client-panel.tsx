import { bookingHref, type ClientRow, type VisitRow } from "@repo/scheduling";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  CalendarX,
  UserRound,
  UserRoundCheck,
  Wallet,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageLink as Link } from "../public-site/page-link";
import { SpecialistChip, Tag } from "../visit-table/visit-chips";
import { Contact, Group, Prop } from "../visit-table/visit-panel";
import {
  VisitPanelCloseLink,
  VisitPanelMotion,
} from "../visit-table/visit-panel-motion";
import { VisitPanelTabs } from "../visit-table/visit-panel-tabs";

// A client open from the clients list (?klient=…), as a booking from the
// bookings table: a 384 px column beside the list (over it on a narrow
// screen), sliding in and out. Tabs: the details (how to reach them, their
// visits in numbers, the centre's note, editing them) and their visits,
// each leading to its booking. Rendered on the server.

const TITLE_ID = "klient-panel-tytul";

function Visits({ visits }: { visits: VisitRow[] }) {
  if (!visits.length) {
    return (
      <p className="px-3.5 py-6 text-[0.8125rem] text-[var(--text-muted)]">
        Ten klient nie ma jeszcze wizyt.
      </p>
    );
  }
  return (
    <ul aria-label="Wizyty klienta">
      {visits.map((visit) => (
        <li className="border-b border-[var(--border)]" key={visit.id}>
          <Link
            className="grid gap-1 px-3.5 py-2 hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--surface-subtle)] focus-visible:outline-none"
            href={bookingHref(visit)}
          >
            <span className="flex items-center gap-2 text-[0.8125rem]">
              <span className="font-semibold tabular-nums">
                {visit.dateLabel}, {visit.time.slice(0, 5)}
              </span>
              <span className="ml-auto">
                <Tag tone={visit.status.tone}>{visit.status.label}</Tag>
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-2 text-[0.75rem] text-[var(--text-muted)]">
              <SpecialistChip row={visit} />
              <span className="truncate">{visit.serviceName}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ClientPanel({
  row,
  notes,
  cancelled,
  visits,
  tab,
  tabs,
  closeHref,
  edit,
}: {
  row: ClientRow;
  /** The centre's note. */
  notes: string | null;
  /** Visits they cancelled. */
  cancelled: number;
  /** Their visits, latest first. */
  visits: VisitRow[];
  tab: "szczegoly" | "wizyty";
  tabs: { key: "szczegoly" | "wizyty"; label: string; href: string }[];
  /** The list's address without the panel. */
  closeHref: string;
  /** "Edytuj dane" and its form. */
  edit?: ReactNode;
}) {
  return (
    <VisitPanelMotion
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-overlay)] xl:static xl:z-auto xl:w-96 xl:max-w-none xl:shrink-0 xl:shadow-none"
      closeHref={closeHref}
      labelledBy={TITLE_ID}
      visitId={row.id}
    >
      <header className="shrink-0 border-b border-[var(--border)] px-3.5 pt-2.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
            {row.since}
          </p>
          <VisitPanelCloseLink
            aria-label="Zamknij kartę klienta"
            className="-mr-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={closeHref}
          >
            <X aria-hidden="true" className="size-4" />
          </VisitPanelCloseLink>
        </div>
        <h2
          className="truncate text-[0.9375rem] leading-tight font-semibold text-[var(--text)]"
          id={TITLE_ID}
        >
          {row.name}
        </h2>
      </header>

      <VisitPanelTabs
        initial={tabs.some((one) => one.key === tab) ? tab : "szczegoly"}
        key={row.id}
        label="Sekcje klienta"
        panes={{
          szczegoly: (
            <>
              <Group title="Kontakt">
                <Prop icon={<UserRound aria-hidden="true" />} label="Klient">
                  <span className="font-medium">{row.name}</span>
                </Prop>
                <Contact email={row.email} phone={row.phone} />
              </Group>
              <Group title="Wizyty">
                <Prop
                  icon={<CalendarRange aria-hidden="true" />}
                  label="Wszystkie"
                >
                  <span className="tabular-nums">
                    {row.visits}
                    {row.upcoming ? (
                      <span className="text-[var(--text-muted)]">
                        {" "}
                        · {row.upcoming}
                      </span>
                    ) : null}
                  </span>
                </Prop>
                <Prop
                  icon={<CalendarX aria-hidden="true" />}
                  label="Odwołane"
                >
                  <span className="tabular-nums">{cancelled}</span>
                </Prop>
                <Prop
                  icon={<CalendarCheck aria-hidden="true" />}
                  label="Ostatnia"
                >
                  <span className="tabular-nums">{row.lastVisit}</span>
                </Prop>
                <Prop
                  icon={<CalendarPlus aria-hidden="true" />}
                  label="Następna"
                >
                  <span className="tabular-nums">{row.nextVisit}</span>
                </Prop>
                <Prop icon={<Wallet aria-hidden="true" />} label="Zapłacono">
                  <span className="font-medium tabular-nums">{row.paid}</span>
                </Prop>
                <Prop
                  icon={<UserRoundCheck aria-hidden="true" />}
                  label="Od kiedy"
                >
                  <span className="tabular-nums">
                    {row.since.replace(/^Klient od /, "")}
                  </span>
                </Prop>
              </Group>
              <Group title="Notatka centrum">
                <p className="px-2 pb-1.5 text-[0.8125rem] whitespace-pre-line text-[var(--text)]">
                  {notes ?? (
                    <span className="text-[var(--text-muted)]">
                      Brak notatki.
                    </span>
                  )}
                </p>
              </Group>
            </>
          ),
          wizyty: <Visits visits={visits} />,
        }}
        tabs={tabs}
      />

      <div
        aria-label="Akcje klienta"
        className="flex h-10 shrink-0 items-center gap-1.5 border-t border-[var(--border)] bg-[var(--surface)] px-2"
        role="toolbar"
      >
        {edit}
        <Link
          className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--border)] px-2.5 text-[0.8125rem] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={row.href}
        >
          Karta klienta
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </VisitPanelMotion>
  );
}
