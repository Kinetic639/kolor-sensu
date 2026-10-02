import type {
  ClientRow,
  VisitEventRow,
  VisitRow,
  VisitTone,
} from "@repo/scheduling";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarRange,
  CircleDot,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  NotebookText,
  Phone,
  Tag as TagIcon,
  UserRound,
  UserRoundCheck,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton, IconLink } from "../icon-action";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { PlaceLabel, SpecialistChip, Tag } from "./visit-chips";
import { VisitPanelCloseLink, VisitPanelMotion } from "./visit-panel-motion";

// The visit open from the bookings table (?wizyta=…): a 384 px column
// beside the table on a wide screen (edge to edge, like the table), over
// it on a narrow one. A list of properties, a line each with its icon, as
// in a spreadsheet's record; tabs (in the address, ?karta=…) for the
// details, the history (every event from the hold on) and, for the
// centre, the client (their record: contact, visits in numbers, note). Icon actions at
// the bottom. Rendered on the server; only its coming and going (and
// Escape) run in the browser (./visit-panel-motion).

export type VisitPanelTab = "szczegoly" | "historia" | "klient";

/** The centre's record of the visit's client, for the "Klient" tab. */
export interface VisitPanelClient {
  row: ClientRow;
  /** The centre's note about them. */
  notes: string | null;
}

const TONE_DOT: Record<VisitTone, string> = {
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--text-subtle)]",
};

const TITLE_ID = "wizyta-panel-tytul";

/** A group of properties; its name small above, a thin line between. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--border)] px-1.5 py-1.5 first:border-t-0">
      <h3 className="flex h-6 items-center px-2 text-[0.6875rem] font-semibold tracking-[0.04em] text-[var(--text-muted)]">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

/** One property: its icon and name, then the value (30 px, as a table row). */
function Prop({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-[30px] grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-2 rounded-[5px] px-2 hover:bg-[var(--surface-subtle)]">
      <dt className="flex items-center gap-1.5 text-[0.75rem] text-[var(--text-muted)] [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 py-1 text-[0.8125rem] break-words text-[var(--text)]">
        {children}
      </dd>
    </div>
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
      <span className="-my-1.5 flex shrink-0 items-center [&_a]:size-7 [&_button]:size-7">
        {children}
      </span>
    </span>
  );
}

function Contact({
  phone,
  email,
}: {
  phone: string | null;
  email: string | null;
}) {
  return (
    <>
      <Prop icon={<Phone aria-hidden="true" />} label="Telefon">
        {phone ? (
          <WithActions value={phone}>
            <IconLink
              href={`tel:${phone.replace(/\s/g, "")}`}
              icon={<Phone aria-hidden="true" />}
              label="Zadzwoń"
            />
            <CopyButton label="Kopiuj numer telefonu" value={phone} />
          </WithActions>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </Prop>
      <Prop icon={<Mail aria-hidden="true" />} label="E-mail">
        {email ? (
          <WithActions value={email}>
            <IconLink
              href={`mailto:${email}`}
              icon={<Mail aria-hidden="true" />}
              label="Napisz e-mail"
            />
            <CopyButton label="Kopiuj adres e-mail" value={email} />
          </WithActions>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </Prop>
    </>
  );
}

/** The client's record: contact, their visits in numbers, the note. */
function ClientDetails({ client }: { client: VisitPanelClient | null }) {
  if (!client) {
    return (
      <p className="px-3.5 py-6 text-[0.8125rem] text-[var(--text-muted)]">
        Ta wizyta nie jest powiązana z kartą klienta.
      </p>
    );
  }
  const { row } = client;
  return (
    <>
      <Group title="Kontakt">
        <Prop icon={<UserRound aria-hidden="true" />} label="Klient">
          <span className="font-medium">{row.name}</span>
        </Prop>
        <Contact email={row.email} phone={row.phone} />
      </Group>
      <Group title="Wizyty">
        <Prop icon={<CalendarRange aria-hidden="true" />} label="Wszystkie">
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
        <Prop icon={<CalendarCheck aria-hidden="true" />} label="Ostatnia">
          <span className="tabular-nums">{row.lastVisit}</span>
        </Prop>
        <Prop icon={<CalendarPlus aria-hidden="true" />} label="Następna">
          <span className="tabular-nums">{row.nextVisit}</span>
        </Prop>
        <Prop icon={<Wallet aria-hidden="true" />} label="Zapłacono">
          <span className="font-medium tabular-nums">{row.paid}</span>
        </Prop>
        <Prop icon={<UserRoundCheck aria-hidden="true" />} label="Od kiedy">
          <span className="tabular-nums">
            {row.since.replace(/^Klient od /, "")}
          </span>
        </Prop>
      </Group>
      <Group title="Notatka centrum">
        <p className="px-2 pb-1.5 text-[0.8125rem] whitespace-pre-line text-[var(--text)]">
          {client.notes ?? (
            <span className="text-[var(--text-muted)]">Brak notatki.</span>
          )}
        </p>
      </Group>
      <div className="px-3.5 pt-1 pb-3">
        <Link
          className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--border)] px-2.5 text-[0.8125rem] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={row.href}
        >
          Karta klienta
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </>
  );
}

function Details({
  row,
  specialistAvatar,
}: {
  row: VisitRow;
  specialistAvatar?: string | null;
}) {
  return (
    <>
      <Group title="Wizyta">
        <Prop icon={<CircleDot aria-hidden="true" />} label="Status">
          <span className="flex flex-wrap items-center gap-1.5">
            <Tag tone={row.status.tone}>{row.status.label}</Tag>
            {row.note ? (
              <span className="text-[0.75rem] text-[var(--info)]">
                przełożona
              </span>
            ) : null}
          </span>
        </Prop>
        <Prop icon={<CalendarClock aria-hidden="true" />} label="Termin">
          <span className="tabular-nums">
            {row.weekday}, {row.dateLabel}, {row.time}
          </span>
        </Prop>
        <Prop icon={<TagIcon aria-hidden="true" />} label="Usługa">
          {row.serviceName}
        </Prop>
        <Prop icon={<UsersRound aria-hidden="true" />} label="Specjalista">
          <SpecialistChip avatar={specialistAvatar} row={row} />
        </Prop>
        <Prop icon={<MapPin aria-hidden="true" />} label="Miejsce">
          <PlaceLabel row={row}>{row.place}</PlaceLabel>
        </Prop>
        {row.paymentDue ? (
          <Prop icon={<Clock aria-hidden="true" />} label="Zapłata do">
            <span className="tabular-nums">{row.paymentDue}</span>
          </Prop>
        ) : null}
      </Group>

      <Group title="Klient">
        <Prop icon={<UserRound aria-hidden="true" />} label="Klient">
          <span className="font-medium">{row.clientName}</span>
        </Prop>
        <Contact email={row.email} phone={row.phone} />
        {row.notes ? (
          <Prop icon={<NotebookText aria-hidden="true" />} label="Uwagi">
            {row.notes}
          </Prop>
        ) : null}
      </Group>

      {row.payment ? (
        <Group title="Płatność">
          <Prop icon={<CreditCard aria-hidden="true" />} label="Status">
            <Tag tone={row.payment.tone}>{row.payment.label}</Tag>
          </Prop>
          <Prop
            icon={<Wallet aria-hidden="true" />}
            label={row.cancelled ? "Do zwrotu" : "Kwota"}
          >
            <span className="font-medium tabular-nums">{row.amount}</span>
          </Prop>
        </Group>
      ) : null}
    </>
  );
}

/** Every event, oldest first, on a line. */
function History({ events }: { events: VisitEventRow[] }) {
  if (!events.length) {
    return (
      <p className="px-3.5 py-6 text-[0.8125rem] text-[var(--text-muted)]">
        Brak zapisanych zdarzeń.
      </p>
    );
  }
  return (
    <ol aria-label="Historia rezerwacji" className="px-3.5 py-3">
      {events.map((event, index) => (
        <li className="relative flex gap-2.5 pb-3 last:pb-0" key={event.id}>
          {index < events.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-0 left-[3.5px] w-px bg-[var(--border)]"
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              "relative mt-1.5 size-2 shrink-0 rounded-full ring-2 ring-[var(--surface)]",
              TONE_DOT[event.tone],
            )}
          />
          <div className="min-w-0 text-[0.8125rem] leading-snug">
            <p className="font-medium text-[var(--text)]">{event.title}</p>
            {event.detail ? (
              <p className="text-[var(--text)]">{event.detail}</p>
            ) : null}
            <p className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
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
  specialistAvatar,
  client = null,
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
  /** The specialist's picture (initials without). */
  specialistAvatar?: string | null;
  /** The client's record, for the "Klient" tab. */
  client?: VisitPanelClient | null;
}) {
  // A tab not offered here (e.g. "Klient" for a specialist): the details.
  const shown = tabs.some((one) => one.key === tab) ? tab : "szczegoly";
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
            {row.reference}
          </p>
          <VisitPanelCloseLink
            aria-label="Zamknij szczegóły wizyty"
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
          {row.clientName}
        </h2>
      </header>

      <nav
        aria-label="Sekcje rezerwacji"
        className="flex h-8 shrink-0 items-stretch gap-3.5 border-b border-[var(--border)] px-3.5"
      >
        {tabs.map((one) => {
          const active = one.key === shown;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center text-[0.8125rem] outline-none focus-visible:text-[var(--text)] focus-visible:underline",
                active
                  ? "font-medium text-[var(--text)] shadow-[inset_0_-2px_0_var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
              href={one.href}
              key={one.key}
              scroll={false}
            >
              {one.label}
            </Link>
          );
        })}
      </nav>

      {/* Only the tab scrolls, inside the panel (never the page under it);
          the header and the toolbar stay in view. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {shown === "historia" ? (
          <History events={events ?? []} />
        ) : shown === "klient" ? (
          <ClientDetails client={client} />
        ) : (
          <Details row={row} specialistAvatar={specialistAvatar} />
        )}
      </div>

      <div
        aria-label="Akcje rezerwacji"
        className="flex h-10 shrink-0 items-center gap-0.5 border-t border-[var(--border)] bg-[var(--surface)] px-2"
        role="toolbar"
      >
        <CopyButton label="Kopiuj numer rezerwacji" value={row.reference} />
        {toolbar}
      </div>
    </VisitPanelMotion>
  );
}
