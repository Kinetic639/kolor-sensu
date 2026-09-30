import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BookingError, bookingError } from "./booking";

// The client changing a visit from its e-mail link (docs/product/booking-
// plan.md, R8): the database decides whether they still may (the centre's
// windows and limit) and moves or cancels it. Secret client only; only the
// link's token works, never the hold's.

type Client = SupabaseClient<Database>;

export interface CancelledBooking {
  reference: string;
  /** What to give back (0: nothing, too late or unpaid). */
  refundMinor: number;
  /** The payment to refund it from. */
  paymentIntentId: string | null;
}

/** Cancels the visit. Throws a BookingError (not_found, not_cancellable). */
export async function cancelBooking(
  client: Client,
  manageToken: string,
): Promise<CancelledBooking> {
  const { data, error } = await client.rpc("cancel_booking", {
    p_manage_token: manageToken,
  });
  if (error) throw bookingError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "Cancelling returned nothing");
  return {
    reference: row.reference,
    refundMinor: row.refund_minor,
    paymentIntentId: row.payment_intent_id ?? null,
  };
}

/** Free times the visit may move to (none when it may not move). */
export async function listRescheduleSlots(
  client: Client,
  manageToken: string,
  range: { from: string; to: string },
) {
  const { data, error } = await client.rpc("list_reschedule_slots", {
    p_manage_token: manageToken,
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return data ?? [];
}

export interface RescheduledBooking {
  reference: string;
  startsAt: string;
  endsAt: string;
  rescheduleCount: number;
}

/**
 * Moves the visit to a free time (as listRescheduleSlots gave it). Throws a
 * BookingError: slot_unavailable, not_reschedulable, not_found.
 */
export async function rescheduleBooking(
  client: Client,
  manageToken: string,
  startsAt: string,
): Promise<RescheduledBooking> {
  const { data, error } = await client.rpc("reschedule_booking", {
    p_manage_token: manageToken,
    p_starts_at: startsAt,
  });
  if (error) throw bookingError(error);
  const row = data?.[0];
  if (!row) throw new BookingError("unknown", "Moving returned nothing");
  return {
    reference: row.reference,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    rescheduleCount: row.reschedule_count,
  };
}
