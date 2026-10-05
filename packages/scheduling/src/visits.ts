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
  /**
   * The end of its whole time: the visit and the time after it its service
   * holds (notes, getting ready), where the list gives it.
   */
  heldUntil?: string | null;
  /** Where the list gives it. */
  serviceId?: string;
  serviceName: string;
  specialist: { id: string; name: string; color: string | null };
  room: { id: string; name: string; color: string | null } | null;
  locationName: string | null;
  client: {
    /** The centre's client (their card), where the list says. */
    id?: string | null;
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
  /** "system": not paid in time (R11). */
  cancelledBy: "client" | "centre" | "system" | null;
  rescheduleCount: number;
  /** A reservation: to be paid by then, or it is cancelled (R11). */
  paymentDueAt?: string | null;
  /** When it was booked (where known). */
  createdAt?: string | null;
  /** When it last changed (where known). */
  changedAt?: string | null;
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
  /** When it was booked, `01.10.2026, 14:32` where the centre is; null unknown. */
  created: string | null;
  /** When it last changed, as `created`. */
  changed: string | null;
  clientName: string;
  /** The centre's client (their card), where known. */
  clientId: string | null;
  serviceName: string;
  specialistId: string;
  specialistName: string;
  specialistColor: string | null;
  /** `Gabinet Zielony · Siedziba Główna`, or `Online`. */
  place: string;
  /** `Gabinet Zielony`, or `Online`. */
  room: string;
  /** The room's own colour (null: online, none set, or no room). */
  roomColor: string | null;
  locationName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  /** The price, or what is owed back on a cancelled visit: `200 zł`. */
  amount: string;
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
  /** A reservation not paid yet: `pon. 30.09, 11:00`, where the centre is. */
  paymentDue: string | null;
  /** Its link to pay can be e-mailed again (still payable, has an e-mail). */
  resendable: boolean;
  /** Admins: what is left of the payment to give back (0: nothing). */
  refundableMinor: number;
  /** Admins: a refund promised that has not gone back (0: none). */
  owedMinor: number;
  currencyCode: string;
  mode: "in_person" | "online";
  roomId: string | null;
  /** Still ahead and booked: the centre may move it. */
  movable: boolean;
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
          : visit.cancelledBy === "system"
            ? "Anulowana – brak płatności"
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
      ? { label: "Zwrócono", tone: "info" }
      : {
          label: "Zwrot do zlecenia",
          tone: "danger",
        };
  }
  return payment.paid
    ? { label: "Opłacona", tone: "success" }
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
  const stamp = (instant: string) =>
    formatInTimeZone(new Date(instant), timeZone, "dd.MM.yyyy, HH:mm");
  const cancelled = visit.status === "cancelled";
  const reservation =
    visit.status === "awaiting_payment" ? (visit.paymentDueAt ?? null) : null;
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
    created: visit.createdAt ? stamp(visit.createdAt) : null,
    changed: visit.changedAt ? stamp(visit.changedAt) : null,
    clientName: visit.client.name ?? "Klient",
    clientId: visit.client.id ?? null,
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
    room:
      visit.mode === "online" ? "Online" : (visit.room?.name ?? "Stacjonarnie"),
    roomColor: visit.mode === "online" ? null : (visit.room?.color ?? null),
    locationName: visit.mode === "online" ? null : visit.locationName,
    phone: visit.client.phone,
    email: visit.client.email,
    notes: visit.client.notes,
    amount: money(
      visit.status === "cancelled" && visit.payment?.refundDueMinor
        ? visit.payment.refundDueMinor
        : visit.priceMinor,
      visit.currencyCode,
    ),
    payment: paymentOf(visit),
    contact,
    note: visit.rescheduleCount > 0 ? "Przełożona przez klienta" : null,
    cancelled,
    cancellable:
      !cancelled &&
      (visit.status === "confirmed" || visit.status === "awaiting_payment") &&
      new Date(visit.startsAt) > now,
    paymentDue: reservation ? dueLabel(reservation, timeZone) : null,
    resendable:
      reservation !== null &&
      new Date(reservation) > now &&
      Boolean(visit.client.email),
    // A refund promised and not gone back yet is not given again: it is
    // owed (settled on its own), and what is left is past it.
    refundableMinor: visit.payment?.paid
      ? Math.max(
          0,
          visit.priceMinor -
            Math.max(
              visit.payment.refundedMinor,
              visit.payment.refundDueMinor ?? 0,
            ),
        )
      : 0,
    owedMinor: visit.payment
      ? Math.max(
          0,
          (visit.payment.refundDueMinor ?? 0) - visit.payment.refundedMinor,
        )
      : 0,
    currencyCode: visit.currencyCode,
    mode: visit.mode,
    roomId: visit.mode === "in_person" ? (visit.room?.id ?? null) : null,
    movable:
      !cancelled &&
      (visit.status === "confirmed" || visit.status === "awaiting_payment") &&
      new Date(visit.startsAt) > now,
  };
}

/** `pon. 30.09, 11:00`, where the centre is. */
function dueLabel(instant: string, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    timeZone,
  }).format(new Date(instant));
  return `${weekday} ${formatInTimeZone(new Date(instant), timeZone, "dd.MM, HH:mm")}`;
}

/**
 * One booking in the bookings table, wherever it is clicked (the
 * dashboard, a notification, a client): searched by its number over all
 * time, open in the side panel. Nothing else filtered.
 */
export function bookingHref({
  id,
  reference,
}: {
  id: string;
  reference?: string | null;
}) {
  return `/rezerwacje?${new URLSearchParams({
    zakres: "wszystkie",
    ...(reference ? { q: reference } : {}),
    wizyta: id,
  })}`;
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
