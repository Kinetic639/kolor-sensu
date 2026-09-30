import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BookingError,
  bookingError,
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
  cancelledBy: "client" | "centre" | null;
  cancelledAt: string | null;
  rescheduleCount: number;
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
  "starts_at" | "client" | "specialist" | "service" | "price" | "status";

export interface VisitSearch {
  /** Words to find in the client, reference, service or specialist. */
  query?: string | null;
  statuses?: ("confirmed" | "awaiting_payment" | "cancelled")[] | null;
  /** Cancelled visits whose money has not gone back (admins). */
  refundDue?: boolean;
  specialistId?: string | null;
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
    p_refund_due: search.refundDue,
    p_specialist_id: search.specialistId ?? undefined,
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
    cancelledBy:
      row.cancelled_by === "client" || row.cancelled_by === "centre"
        ? row.cancelled_by
        : null,
    cancelledAt: row.cancelled_at ?? null,
    rescheduleCount: row.reschedule_count,
  };
}

export interface CentreCancelledVisit {
  reference: string;
  refundMinor: number;
  paymentIntentId: string | null;
  rescheduleCount: number;
}

/** Cancels as the centre (admins). Throws a BookingError. */
export async function centreCancelVisit(
  client: Client,
  appointmentId: string,
): Promise<CentreCancelledVisit> {
  const { data, error } = await client.rpc("centre_cancel_visit", {
    p_appointment_id: appointmentId,
  });
  if (error) throw bookingError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "Cancelling returned nothing");
  return {
    reference: row.reference,
    refundMinor: row.refund_minor,
    paymentIntentId: row.payment_intent_id ?? null,
    rescheduleCount: row.reschedule_count,
  };
}
