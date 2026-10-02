import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BookingError,
  bookingError,
  cancelledByOf,
  type AppointmentStatus,
  type VisitMode,
} from "./booking";

// Visits in the portals (docs/product/booking-plan.md, R9): a specialist
// reads their own, an admin all of them with the payments; the centre
// cancels one (always with the money back). The database checks who asks.

type Client = SupabaseClient<Database>;

export interface Visit {
  id: string;
  reference: string;
  status: AppointmentStatus;
  mode: VisitMode;
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
  /** Admins only (null for a specialist). */
  payment: {
    paid: boolean;
    /** Owed on cancelling (null: not cancelled). */
    refundDueMinor: number | null;
    refundedMinor: number;
  } | null;
  /** "system": not paid in time. */
  cancelledBy: "client" | "centre" | "system" | null;
  cancelledAt: string | null;
  rescheduleCount: number;
  /** A reservation: to be paid by then, or it is cancelled (R11). */
  paymentDueAt: string | null;
}

export interface VisitsQuery {
  /** Local dates, at most 63 days. */
  from: string;
  to: string;
  specialistId?: string;
  /** Only the caller's own visits, without payments (the specialist portal). */
  own?: boolean;
}

export async function listVisits(
  client: Client,
  query: VisitsQuery,
): Promise<Visit[]> {
  const { data, error } = await client.rpc("list_visits", {
    p_from: query.from,
    p_to: query.to,
    p_specialist_id: query.specialistId,
    p_own: query.own,
  });
  if (error) throw error;
  return (data ?? []).map(toVisit);
}

export type VisitSort =
  | "starts_at"
  | "client"
  | "specialist"
  | "service"
  | "price"
  | "status"
  | "place";

export interface VisitSearch {
  /** Words to find in the client, reference, service or specialist. */
  query?: string | null;
  statuses?: ("confirmed" | "awaiting_payment" | "cancelled")[] | null;
  /** Paid, unpaid, refunds to settle, refunded (admins). */
  payment?: "paid" | "unpaid" | "refund_due" | "refunded" | null;
  specialistId?: string | null;
  serviceId?: string | null;
  roomId?: string | null;
  /** True: online visits only; false: in person only. */
  online?: boolean | null;
  /** Instants (ISO): visits starting from, and before. */
  from?: string | null;
  to?: string | null;
  sort: VisitSort;
  descending: boolean;
  /** 1–100. */
  limit: number;
  offset: number;
  own?: boolean;
}

/** One page of visits and how many match in all (the bookings table). */
export async function searchVisits(
  client: Client,
  search: VisitSearch,
): Promise<{ visits: Visit[]; total: number }> {
  const { data, error } = await client.rpc("search_visits", {
    p_query: search.query ?? undefined,
    p_statuses: search.statuses ?? undefined,
    p_payment: search.payment ?? undefined,
    p_specialist_id: search.specialistId ?? undefined,
    p_service_id: search.serviceId ?? undefined,
    p_room_id: search.roomId ?? undefined,
    p_online: search.online ?? undefined,
    p_from: search.from ?? undefined,
    p_to: search.to ?? undefined,
    p_sort: search.sort,
    p_desc: search.descending,
    p_limit: search.limit,
    p_offset: search.offset,
    p_own: search.own,
  });
  if (error) throw error;
  const rows = data ?? [];
  return {
    visits: rows.map(toVisit),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

/** A visit with what the side panel adds: its history and e-mails. */
export interface VisitDetail extends Visit {
  createdAt: string;
  confirmedAt: string | null;
  /** E-mails sent about it (admins; null for a specialist). */
  emails: { kind: string; sentAt: string }[] | null;
}

/** One visit for the side panel, or null (none, or not the caller's). */
export async function getVisit(
  client: Client,
  id: string,
  { own = false }: { own?: boolean } = {},
): Promise<VisitDetail | null> {
  const { data, error } = await client.rpc("get_visit", {
    p_id: id,
    p_own: own,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  const emails = Array.isArray(row.emails)
    ? (row.emails as { kind: string; sent_at: string }[]).map((email) => ({
        kind: email.kind,
        sentAt: email.sent_at,
      }))
    : null;
  return {
    ...toVisit(row),
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at ?? null,
    emails,
  };
}

type VisitRow =
  Database["public"]["Functions"]["list_visits"]["Returns"][number];

function toVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    mode: row.mode,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    serviceName: row.service_name,
    specialist: {
      id: row.specialist_id,
      name: row.specialist_name,
      color: row.specialist_color ?? null,
    },
    room:
      row.room_id && row.room_name
        ? {
            id: row.room_id,
            name: row.room_name,
            color: row.room_color ?? null,
          }
        : null,
    locationName: row.location_name ?? null,
    client: {
      name: row.client_name ?? null,
      email: row.client_email ?? null,
      phone: row.client_phone ?? null,
      notes: row.client_notes ?? null,
    },
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    payment:
      row.paid === null || row.paid === undefined
        ? null
        : {
            paid: row.paid,
            refundDueMinor: row.refund_due_minor ?? null,
            refundedMinor: row.refunded_minor ?? 0,
          },
    cancelledBy: cancelledByOf(row.cancelled_by),
    cancelledAt: row.cancelled_at ?? null,
    rescheduleCount: row.reschedule_count,
    paymentDueAt: row.payment_due_at ?? null,
  };
}

export interface CentreCancelledVisit {
  reference: string;
  refundMinor: number;
  paymentIntentId: string | null;
  rescheduleCount: number;
}

/**
 * Cancels as the centre (admins), at any time, giving back what the admin
 * chose (null: all that is left of the payment). Throws a BookingError.
 */
export async function centreCancelVisit(
  client: Client,
  appointmentId: string,
  {
    refundMinor = null,
    reason = null,
  }: { refundMinor?: number | null; reason?: string | null } = {},
): Promise<CentreCancelledVisit> {
  const { data, error } = await client.rpc("centre_cancel_visit", {
    p_appointment_id: appointmentId,
    p_refund_minor: refundMinor,
    p_reason: reason,
  });
  if (error) throw centreError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "Cancelling returned nothing");
  return {
    reference: row.reference,
    refundMinor: row.refund_minor,
    paymentIntentId: row.payment_intent_id ?? null,
    rescheduleCount: row.reschedule_count,
  };
}

export type VisitEventActor = "client" | "centre" | "payment" | "system";

/** One entry of a visit's history (the audit log). */
export interface VisitEvent {
  id: number;
  occurredAt: string;
  kind: string;
  actor: VisitEventActor;
  /** The signed-in person behind it (an admin), if any. */
  actorName: string | null;
  details: Record<string, unknown>;
}

/** A visit's history, oldest first; the money only for admins. */
export async function listVisitEvents(
  client: Client,
  id: string,
  { own = false }: { own?: boolean } = {},
): Promise<VisitEvent[]> {
  const { data, error } = await client.rpc("list_visit_events", {
    p_id: id,
    p_own: own,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    kind: row.kind,
    actor: (["client", "centre", "payment", "system"].includes(row.actor)
      ? row.actor
      : "system") as VisitEventActor,
    actorName: row.actor_name ?? null,
    details:
      row.details &&
      typeof row.details === "object" &&
      !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : {},
  }));
}

/**
 * Sends the link to pay again (R11): lets the reservation's e-mail be
 * claimed once more; the site sends it. Throws a BookingError
 * (recently_sent, not_payable, forbidden).
 */
export async function centreResendPaymentLink(
  client: Client,
  appointmentId: string,
): Promise<string> {
  const { data, error } = await client.rpc("centre_resend_payment_link", {
    p_appointment_id: appointmentId,
  });
  if (error) {
    if (error.code === "42501") {
      throw new BookingError("forbidden", error.message);
    }
    throw bookingError(error);
  }
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "Nothing to send");
  return row.reference;
}

function centreError(error: {
  message: string;
  hint?: string | null;
  code?: string;
}) {
  return error.code === "42501"
    ? new BookingError("forbidden", error.message)
    : bookingError(error);
}

export interface CentreRefund {
  reference: string;
  refundMinor: number;
  paymentIntentId: string;
  /** Given back before this refund (to tell one refund from the next). */
  refundedBeforeMinor: number;
}

/** Gives money back later (admins), up to what is left. Throws a BookingError. */
export async function centreRefundVisit(
  client: Client,
  appointmentId: string,
  refundMinor: number,
  reason: string | null,
): Promise<CentreRefund> {
  const { data, error } = await client.rpc("centre_refund_visit", {
    p_appointment_id: appointmentId,
    p_refund_minor: refundMinor,
    p_reason: reason,
  });
  if (error) throw centreError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "The refund returned nothing");
  return {
    reference: row.reference,
    refundMinor: row.refund_minor,
    paymentIntentId: row.payment_intent_id,
    refundedBeforeMinor: row.refunded_before_minor,
  };
}

export interface CentreMove {
  /** An instant (ISO). */
  startsAt: string;
  mode: VisitMode;
  /** In person only. */
  roomId: string | null;
  reason: string | null;
}

export interface CentreMovedVisit {
  reference: string;
  startsAt: string;
  endsAt: string;
  /** The calendar event's version: how many times it has moved. */
  sequence: number;
  paymentDueAt: string | null;
}

/** Moves a visit anywhere free (admins). Throws a BookingError. */
export async function centreRescheduleVisit(
  client: Client,
  appointmentId: string,
  move: CentreMove,
): Promise<CentreMovedVisit> {
  const { data, error } = await client.rpc("centre_reschedule_visit", {
    p_appointment_id: appointmentId,
    p_starts_at: move.startsAt,
    p_mode: move.mode,
    p_room_id: move.mode === "in_person" ? move.roomId : null,
    p_reason: move.reason,
  });
  if (error) throw centreError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "The move returned nothing");
  return {
    reference: row.reference,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sequence: row.sequence,
    paymentDueAt: row.payment_due_at ?? null,
  };
}

/** Money owed to a client that Stripe has not given back (R14). */
export interface Settlement {
  appointmentId: string;
  reference: string;
  /** Owed on a cancellation or a later refund; or paid for a visit that never was. */
  kind: "refund_owed" | "paid_without_visit";
  status: AppointmentStatus;
  startsAt: string;
  client: { name: string | null; email: string | null; phone: string | null };
  serviceName: string;
  specialistName: string | null;
  paidMinor: number;
  refundedMinor: number;
  owedMinor: number;
  currencyCode: string;
  /** Owed since (the last change to it). */
  since: string;
}

/** What the centre still has to settle (admins). */
export async function listSettlements(client: Client): Promise<Settlement[]> {
  const { data, error } = await client.rpc("list_settlements");
  if (error) throw centreError(error);
  return (data ?? []).map((row) => ({
    appointmentId: row.appointment_id,
    reference: row.reference,
    kind:
      row.kind === "paid_without_visit" ? "paid_without_visit" : "refund_owed",
    status: row.status,
    startsAt: row.starts_at,
    client: {
      name: row.client_name,
      email: row.client_email,
      phone: row.client_phone,
    },
    serviceName: row.service_name,
    specialistName: row.specialist_name,
    paidMinor: row.paid_minor,
    refundedMinor: row.refunded_minor,
    owedMinor: row.owed_minor,
    currencyCode: row.currency_code,
    since: row.since,
  }));
}

export interface CentreSettlement extends CentreRefund {
  /** This settling's own entry in the history: keeps Stripe's refunds apart. */
  settlementId: number;
}

/** Settles one (admins): what is owed, to refund now. Throws a BookingError. */
export async function centreSettleVisit(
  client: Client,
  appointmentId: string,
): Promise<CentreSettlement> {
  const { data, error } = await client.rpc("centre_settle_visit", {
    p_appointment_id: appointmentId,
  });
  if (error) throw centreError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "Settling returned nothing");
  return {
    reference: row.reference,
    refundMinor: row.refund_minor,
    paymentIntentId: row.payment_intent_id,
    refundedBeforeMinor: row.refunded_before_minor,
    settlementId: row.settlement_id,
  };
}
