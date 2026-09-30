import { formatInTimeZone } from "date-fns-tz";
import { formatDate, formatDayMonth, formatWeekday } from "./labels";

// Booked visits as the portals list them (docs/product/booking-plan.md, R9):
// by the centre's day, with who, what, where, their state and (for the
// admin) the money. Pure, so every state is tested; the calendar views
// (stage K) read the same rows.

export type VisitTone = "neutral" | "success" | "warning" | "danger" | "info";

/** A visit as `listVisits` (@repo/supabase) gives it. */
export interface VisitLike {
  id: string;
  reference: string;
  status: "held" | "awaiting_payment" | "confirmed" | "cancelled" | "expired";
  mode: "in_person" | "online";
  startsAt: string;
  endsAt: string;
  serviceName: string;
  specialist: { id: string; name: string; color: string | null };
  room: { id: string; name: string; color: string | null } | null;
  locationName: string | null;
  client: {
    name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
  };
  priceMinor: number;
  currencyCode: string;
  payment: {
    paid: boolean;
    refundDueMinor: number | null;
    refundedMinor: number;
  } | null;
  cancelledBy: "client" | "centre" | null;
  rescheduleCount: number;
}

export interface VisitRow {
  id: string;
  reference: string;
  /** The local date, `2030-10-02`. */
  date: string;
  /** `2 października 2030` */
  dateLabel: string;
  /** `środa` */
  weekday: string;
  /** `11:00–11:50`, where the centre is. */
  time: string;
  clientName: string;
  serviceName: string;
  specialistId: string;
  specialistName: string;
  specialistColor: string | null;
  place: string;
  status: { label: string; tone: VisitTone };
  /** Paid (admins only; false for a specialist). */
  paid: boolean;
  /** Admins only. */
  payment: { label: string; tone: VisitTone } | null;
  contact: { label: string; value: string }[];
  note: string | null;
  cancelled: boolean;
  /** Still ahead and booked: the centre may cancel it. */
  cancellable: boolean;
}

export interface VisitDay {
  date: string;
  /** `środa, 2 października` */
  label: string;
  visits: VisitRow[];
}

function money(minor: number, currencyCode: string) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

function statusOf(visit: VisitLike): VisitRow["status"] {
  if (visit.status === "cancelled") {
    return {
      label:
        visit.cancelledBy === "centre"
          ? "Odwołana przez centrum"
          : "Odwołana przez klienta",
      tone: "neutral",
    };
  }
  if (visit.status === "awaiting_payment") {
    return { label: "Czeka na płatność", tone: "warning" };
  }
  return { label: "Potwierdzona", tone: "success" };
}

function paymentOf(visit: VisitLike): VisitRow["payment"] {
  const { payment } = visit;
  if (!payment) return null;
  if (visit.status === "cancelled" && payment.refundDueMinor !== null) {
    const due = payment.refundDueMinor;
    if (due === 0) {
      return {
        label: payment.paid ? "Bez zwrotu" : "Nieopłacona",
        tone: "neutral",
      };
    }
    return payment.refundedMinor >= due
      ? { label: `Zwrócono · ${money(due, visit.currencyCode)}`, tone: "info" }
      : {
          label: `Zwrot do zlecenia · ${money(due, visit.currencyCode)}`,
          tone: "danger",
        };
  }
  return payment.paid
    ? {
        label: `Opłacona · ${money(visit.priceMinor, visit.currencyCode)}`,
        tone: "success",
      }
    : { label: "Nieopłacona", tone: "warning" };
}

function rowOf(visit: VisitLike, timeZone: string, now: Date): VisitRow {
  const time = (instant: string) =>
    formatInTimeZone(new Date(instant), timeZone, "HH:mm");
  const contact = [
    { label: "Telefon", value: visit.client.phone },
    { label: "E-mail", value: visit.client.email },
    { label: "Uwagi klienta", value: visit.client.notes },
  ].filter((item): item is { label: string; value: string } =>
    Boolean(item.value),
  );
  const cancelled = visit.status === "cancelled";
  const date = formatInTimeZone(
    new Date(visit.startsAt),
    timeZone,
    "yyyy-MM-dd",
  );
  return {
    id: visit.id,
    reference: visit.reference,
    date,
    dateLabel: formatDate(date),
    weekday: formatWeekday(date),
    time: `${time(visit.startsAt)}–${time(visit.endsAt)}`,
    clientName: visit.client.name ?? "Klient",
    serviceName: visit.serviceName,
    specialistId: visit.specialist.id,
    specialistName: visit.specialist.name,
    specialistColor: visit.specialist.color,
    place:
      visit.mode === "online"
        ? "Online"
        : [visit.room?.name, visit.locationName].filter(Boolean).join(" · ") ||
          "Stacjonarnie",
    status: statusOf(visit),
    paid: visit.payment?.paid ?? false,
    payment: paymentOf(visit),
    contact,
    note: visit.rescheduleCount > 0 ? "Przełożona przez klienta" : null,
    cancelled,
    cancellable:
      !cancelled &&
      (visit.status === "confirmed" || visit.status === "awaiting_payment") &&
      new Date(visit.startsAt) > now,
  };
}

/** The days that have visits, in order, each with its visits. */
export function visitDays(
  visits: VisitLike[],
  { timeZone, now = new Date() }: { timeZone: string; now?: Date },
): VisitDay[] {
  const days = new Map<string, VisitDay>();
  const sorted = [...visits].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
  for (const visit of sorted) {
    const date = formatInTimeZone(
      new Date(visit.startsAt),
      timeZone,
      "yyyy-MM-dd",
    );
    let day = days.get(date);
    if (!day) {
      day = {
        date,
        label: `${formatWeekday(date)}, ${formatDayMonth(date)}`,
        visits: [],
      };
      days.set(date, day);
    }
    day.visits.push(rowOf(visit, timeZone, now));
  }
  return [...days.values()];
}

/** Visits as table rows, in the order given (the database sorts them). */
export function visitRows(
  visits: VisitLike[],
  { timeZone, now = new Date() }: { timeZone: string; now?: Date },
): VisitRow[] {
  return visits.map((visit) => rowOf(visit, timeZone, now));
}

/** Cancelled visits whose money has not gone back yet (admins). */
export function refundsToSettle(visits: VisitLike[]) {
  return visits.filter(
    (visit) =>
      visit.status === "cancelled" &&
      visit.payment !== null &&
      (visit.payment.refundDueMinor ?? 0) > visit.payment.refundedMinor,
  );
}
