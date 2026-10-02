import { formatInTimeZone } from "date-fns-tz";
import type { VisitLike, VisitTone } from "./visits";

// The admin's dashboard (docs/product/booking-plan.md, R14) from real data:
// today's visits, the rooms and the team today, the reservations waiting to
// be paid, and the money still owed to clients. Pure, so it is all tested;
// the page loads, these shape.

const minutesBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);

function moneyOf(minor: number, currencyCode: string) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

const live = (visit: VisitLike) =>
  visit.status === "confirmed" || visit.status === "awaiting_payment";

const inCalendar = (visit: VisitLike, timeZone: string) =>
  `/kalendarz?data=${formatInTimeZone(new Date(visit.startsAt), timeZone, "yyyy-MM-dd")}&wizyta=${visit.id}`;

export interface TodayVisitItem {
  id: string;
  /** `09:00` */
  time: string;
  /** `50 min` */
  duration: string;
  clientName: string;
  /** `konsultacja · Michał Stępień` */
  service: string;
  /** `Gabinet Zielony`, `Online` */
  location: string;
  status: string;
  statusTone: VisitTone;
  href: string;
}

/** Today's visits that take place (paid or waiting for payment), by time. */
export function todayVisitItems(
  visits: VisitLike[],
  { timeZone }: { timeZone: string },
): TodayVisitItem[] {
  return visits
    .filter(live)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((visit) => ({
      id: visit.id,
      time: formatInTimeZone(new Date(visit.startsAt), timeZone, "HH:mm"),
      duration: `${minutesBetween(visit.startsAt, visit.endsAt)} min`,
      clientName: visit.client.name ?? "Klient bez nazwiska",
      service: `${visit.serviceName} · ${visit.specialist.name}`,
      location:
        visit.mode === "online"
          ? "Online"
          : (visit.room?.name ?? "Stacjonarnie"),
      status:
        visit.status === "awaiting_payment" ? "Czeka na płatność" : "Opłacona",
      statusTone: visit.status === "awaiting_payment" ? "warning" : "success",
      href: inCalendar(visit, timeZone),
    }));
}

export interface DaySummaryItem {
  id: string;
  title: string;
  description: string;
  value: string;
  tone: VisitTone;
}

function span(visits: VisitLike[], timeZone: string) {
  const sorted = [...visits].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
  const first = sorted[0]!;
  const last = sorted.at(-1)!;
  return `${formatInTimeZone(new Date(first.startsAt), timeZone, "HH:mm")}–${formatInTimeZone(new Date(last.endsAt), timeZone, "HH:mm")}`;
}

function visitsCount(count: number) {
  if (count === 1) return "1 wizyta";
  const lastTwo = count % 100;
  const last = count % 10;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? `${count} wizyty`
    : `${count} wizyt`;
}

/** Each room's visits today (in person); rooms without any are left out. */
export function roomsToday(
  visits: VisitLike[],
  { timeZone }: { timeZone: string },
): DaySummaryItem[] {
  const byRoom = new Map<string, { name: string; visits: VisitLike[] }>();
  for (const visit of visits.filter(live)) {
    if (visit.mode !== "in_person" || !visit.room) continue;
    const room = byRoom.get(visit.room.id) ?? {
      name: visit.room.name,
      visits: [],
    };
    room.visits.push(visit);
    byRoom.set(visit.room.id, room);
  }
  return [...byRoom.entries()]
    .map(([id, room]) => ({
      id,
      title: room.name,
      description: span(room.visits, timeZone),
      value: visitsCount(room.visits.length),
      tone: "info" as const,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "pl"));
}

/** Each specialist's visits today; those without any are left out. */
export function teamToday(
  visits: VisitLike[],
  { timeZone }: { timeZone: string },
): DaySummaryItem[] {
  const bySpecialist = new Map<string, { name: string; visits: VisitLike[] }>();
  for (const visit of visits.filter(live)) {
    const person = bySpecialist.get(visit.specialist.id) ?? {
      name: visit.specialist.name,
      visits: [],
    };
    person.visits.push(visit);
    bySpecialist.set(visit.specialist.id, person);
  }
  return [...bySpecialist.entries()]
    .map(([id, person]) => {
      const online = person.visits.filter((v) => v.mode === "online").length;
      return {
        id,
        title: person.name,
        description: `${span(person.visits, timeZone)}${online ? ` · online: ${online}` : ""}`,
        value: visitsCount(person.visits.length),
        tone: "success" as const,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "pl"));
}

export interface TodayCounts {
  total: number;
  paid: number;
  awaitingPayment: number;
}

export function todayCounts(visits: VisitLike[]): TodayCounts {
  const taking = visits.filter(live);
  const awaitingPayment = taking.filter(
    (visit) => visit.status === "awaiting_payment",
  ).length;
  return {
    total: taking.length,
    paid: taking.length - awaitingPayment,
    awaitingPayment,
  };
}

/** Reservations waiting to be paid: how many, and the next one due. */
export function awaitingPaymentSummary(
  visits: VisitLike[],
  { timeZone, now = new Date() }: { timeZone: string; now?: Date },
): { count: number; nextDue: string | null; dueSoon: VisitLike[] } {
  const waiting = visits
    .filter(
      (visit) =>
        visit.status === "awaiting_payment" &&
        visit.paymentDueAt &&
        new Date(visit.paymentDueAt) > now,
    )
    .sort((a, b) => a.paymentDueAt!.localeCompare(b.paymentDueAt!));
  const next = waiting[0]?.paymentDueAt;
  const dayAhead = now.getTime() + 24 * 60 * 60 * 1000;
  return {
    count: waiting.length,
    nextDue: next
      ? formatInTimeZone(new Date(next), timeZone, "dd.MM, HH:mm")
      : null,
    dueSoon: waiting.filter(
      (visit) => new Date(visit.paymentDueAt!).getTime() <= dayAhead,
    ),
  };
}

/** Money owed to a client, as `listSettlements` (@repo/supabase) gives it. */
export interface SettlementLike {
  appointmentId: string;
  reference: string;
  kind: "refund_owed" | "paid_without_visit";
  startsAt: string;
  client: { name: string | null; email: string | null; phone: string | null };
  serviceName: string;
  owedMinor: number;
  currencyCode: string;
  since: string;
}

export interface SettlementView {
  id: string;
  reference: string;
  /** `Zwrot nie doszedł do skutku`, `Płatność bez wizyty` */
  title: string;
  /** `Jan Kowalski · 2610-004 · sob. 03.10, 11:00 · od 01.10` */
  description: string;
  owedMinor: number;
  /** `200 zł` */
  owed: string;
  /** Who gets it, for the confirmation: `Jan Kowalski`. */
  clientName: string;
  href: string;
}

export function settlementView(
  settlement: SettlementLike,
  { timeZone }: { timeZone: string },
): SettlementView {
  const starts = new Date(settlement.startsAt);
  const weekday = new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    timeZone,
  }).format(starts);
  const clientName = settlement.client.name ?? "Klient bez nazwiska";
  return {
    id: settlement.appointmentId,
    reference: settlement.reference,
    title:
      settlement.kind === "paid_without_visit"
        ? "Płatność bez wizyty"
        : "Zwrot nie doszedł do skutku",
    description: [
      clientName,
      settlement.reference,
      `${weekday} ${formatInTimeZone(starts, timeZone, "dd.MM, HH:mm")}`,
      `od ${formatInTimeZone(new Date(settlement.since), timeZone, "dd.MM")}`,
    ].join(" · "),
    owedMinor: settlement.owedMinor,
    owed: moneyOf(settlement.owedMinor, settlement.currencyCode),
    clientName,
    href: `/rezerwacje?wizyta=${settlement.appointmentId}`,
  };
}

/** `250 zł` owed in all. */
export function owedInAll(settlements: SettlementLike[]) {
  const currency = settlements[0]?.currencyCode ?? "PLN";
  return moneyOf(
    settlements.reduce((sum, item) => sum + item.owedMinor, 0),
    currency,
  );
}
