import { formatInTimeZone } from "date-fns-tz";
import type { VisitLike } from "./visits";

// The centre's clients as the admin portal shows them
// (docs/product/booking-plan.md, R15): the list's rows and a client's
// visits, sorted and paged in the portal (a client has a few dozen at most).

/** A client as `searchClients` / `getClient` (@repo/supabase) give it. */
export interface ClientLike {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  visits: number;
  upcoming: number;
  cancelled: number;
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  paidMinor: number;
  createdAt: string;
}

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** `3` */
  visits: string;
  /** `1 nadchodząca`, or null. */
  upcoming: string | null;
  /** `20.09.2026`, or `—`. */
  lastVisit: string;
  /** `pon. 05.10.2026, 10:00`, or `—`. */
  nextVisit: string;
  /** `600 zł` */
  paid: string;
  /** `Klient od 01.09.2026` */
  since: string;
  href: string;
}

function upcomingLabel(count: number) {
  if (count === 0) return null;
  if (count === 1) return "1 nadchodząca";
  const last = count % 10;
  const lastTwo = count % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? `${count} nadchodzące`
    : `${count} nadchodzących`;
}

export function clientRows(
  clients: ClientLike[],
  {
    timeZone,
    currencyCode = "PLN",
  }: { timeZone: string; currencyCode?: string },
): ClientRow[] {
  const date = (instant: string) =>
    formatInTimeZone(new Date(instant), timeZone, "dd.MM.yyyy");
  const dateTime = (instant: string) => {
    const weekday = new Intl.DateTimeFormat("pl-PL", {
      weekday: "short",
      timeZone,
    }).format(new Date(instant));
    return `${weekday} ${formatInTimeZone(new Date(instant), timeZone, "dd.MM.yyyy, HH:mm")}`;
  };
  const money = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    visits: String(client.visits),
    upcoming: upcomingLabel(client.upcoming),
    lastVisit: client.lastVisitAt ? date(client.lastVisitAt) : "—",
    nextVisit: client.nextVisitAt ? dateTime(client.nextVisitAt) : "—",
    paid: money.format(client.paidMinor / 100),
    since: `Klient od ${date(client.createdAt)}`,
    href: `/klienci/${client.id}`,
  }));
}

export type VisitSortKey =
  | "termin"
  | "klient"
  | "specjalista"
  | "usluga"
  | "miejsce"
  | "kwota"
  | "status"
  | "utworzono"
  | "zmiana";

const STATUS_ORDER: Record<VisitLike["status"], number> = {
  confirmed: 0,
  awaiting_payment: 1,
  held: 2,
  cancelled: 3,
  expired: 4,
};

const placeOf = (visit: VisitLike) =>
  visit.mode === "online" ? "Online" : (visit.room?.name ?? "");

/** Visits sorted as the bookings table sorts them (then by time). */
export function sortVisits<T extends VisitLike>(
  visits: T[],
  key: VisitSortKey,
  direction: "asc" | "desc",
): T[] {
  const text = (a: string, b: string) => a.localeCompare(b, "pl");
  const compare: Record<VisitSortKey, (a: T, b: T) => number> = {
    termin: (a, b) => a.startsAt.localeCompare(b.startsAt),
    klient: (a, b) => text(a.client.name ?? "", b.client.name ?? ""),
    specjalista: (a, b) => text(a.specialist.name, b.specialist.name),
    usluga: (a, b) => text(a.serviceName, b.serviceName),
    miejsce: (a, b) => text(placeOf(a), placeOf(b)),
    kwota: (a, b) => a.priceMinor - b.priceMinor,
    status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    utworzono: (a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
    zmiana: (a, b) =>
      (a.changedAt ?? a.createdAt ?? "").localeCompare(
        b.changedAt ?? b.createdAt ?? "",
      ),
  };
  const sign = direction === "asc" ? 1 : -1;
  return [...visits].sort(
    (a, b) =>
      sign * compare[key](a, b) ||
      sign * a.startsAt.localeCompare(b.startsAt) ||
      a.reference.localeCompare(b.reference),
  );
}
