import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BookingError, type BookingErrorCode } from "./booking";

// Paying for a visit (docs/product/booking-plan.md, R6, R11): tying a Stripe
// Checkout Session to the hold, or to a reservation paid later from its
// link, and its outcome. Secret client only.

type Client = SupabaseClient<Database>;

function bookingError(error: { message: string; hint?: string | null }) {
  const known: BookingErrorCode[] = [
    "hold_expired",
    "details_required",
    "amount_mismatch",
    "consent_required",
    "not_payable",
  ];
  return new BookingError(
    known.includes(error.hint as BookingErrorCode)
      ? (error.hint as BookingErrorCode)
      : "unknown",
    error.message,
  );
}

export interface CheckoutSessionLink {
  sessionId: string;
  /** When the session (and so the hold) ends. */
  expiresAt: string;
  amountMinor: number;
  currencyCode: string;
}

/** Ties the session to the client's hold. Throws a BookingError. */
export async function attachCheckoutSession(
  client: Client,
  accessToken: string,
  session: CheckoutSessionLink,
) {
  const { error } = await client.rpc("attach_checkout_session", {
    p_access_token: accessToken,
    p_session_id: session.sessionId,
    p_expires_at: session.expiresAt,
    p_amount_minor: session.amountMinor,
    p_currency_code: session.currencyCode,
  });
  if (error) throw bookingError(error);
}

/** The session the client is paying in, if any. */
export async function pendingCheckoutSession(
  client: Client,
  accessToken: string,
) {
  const { data, error } = await client.rpc("pending_checkout_session", {
    p_access_token: accessToken,
  });
  if (error) throw error;
  return data?.[0]?.checkout_session_id ?? null;
}

/**
 * Paying a reservation from its link: the consents first (a visit the
 * centre booked has none yet). Throws a BookingError (not_payable).
 */
export async function acceptBookingTerms(client: Client, token: string) {
  const { error } = await client.rpc("accept_booking_terms", {
    p_token: token,
  });
  if (error) throw bookingError(error);
}

/** Ties the session to a reservation, by its link. Throws a BookingError. */
export async function attachReservationPayment(
  client: Client,
  token: string,
  session: Omit<CheckoutSessionLink, "expiresAt">,
) {
  const { error } = await client.rpc("attach_reservation_payment", {
    p_token: token,
    p_session_id: session.sessionId,
    p_amount_minor: session.amountMinor,
    p_currency_code: session.currencyCode,
  });
  if (error) throw bookingError(error);
}

/** The session a reservation is being paid in, if any. */
export async function pendingReservationPayment(client: Client, token: string) {
  const { data, error } = await client.rpc("pending_reservation_payment", {
    p_token: token,
  });
  if (error) throw error;
  return data?.[0]?.checkout_session_id ?? null;
}

export type FulfillmentOutcome =
  | "confirmed"
  | "already_confirmed"
  | "awaiting_payment"
  /** The time was taken meanwhile, or the visit cancelled: refund it. */
  | "slot_lost"
  /** Paid twice, or not the visit's price: refund this payment. */
  | "refund_payment"
  /** Settled before (confirmed or refunded): nothing to do. */
  | "already_settled"
  | "unknown_session";

/** A completed session: confirms the visit (idempotent). */
export async function fulfillCheckoutSession(
  client: Client,
  sessionId: string,
  paid: boolean,
  paymentIntentId: string | null,
) {
  const { data, error } = await client.rpc("fulfill_checkout_session", {
    p_session_id: sessionId,
    p_paid: paid,
    // Null keeps what was recorded (the generated type says string only).
    p_payment_intent_id: paymentIntentId as string,
  });
  if (error) throw error;
  return data as FulfillmentOutcome;
}

/** A session that failed or expired: frees the time. */
export async function failCheckoutSession(
  client: Client,
  sessionId: string,
  reason: "failed" | "expired",
) {
  const { error } = await client.rpc("fail_checkout_session", {
    p_session_id: sessionId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function recordRefund(
  client: Client,
  paymentIntentId: string,
  refundedMinor: number,
) {
  const { data, error } = await client.rpc("record_refund", {
    p_payment_intent_id: paymentIntentId,
    p_refunded_minor: refundedMinor,
  });
  if (error) throw error;
  return Boolean(data);
}

/**
 * A dispute (a chargeback) on a visit's payment, opened or closed: written
 * to its history, the admins told. The visit's reference, or null when the
 * payment is not a visit's.
 */
export async function recordDispute(
  client: Client,
  dispute: {
    paymentIntentId: string;
    disputeId: string;
    status: string;
    amountMinor: number;
    reason: string;
    closed: boolean;
  },
) {
  const { data, error } = await client.rpc("record_dispute", {
    p_payment_intent_id: dispute.paymentIntentId,
    p_dispute_id: dispute.disputeId,
    p_status: dispute.status,
    p_amount_minor: dispute.amountMinor,
    p_reason: dispute.reason,
    p_closed: dispute.closed,
  });
  if (error) throw error;
  return data ?? null;
}

/** Checkout Sessions still pending two hours on, to ask Stripe about. */
export async function listStuckPayments(client: Client): Promise<string[]> {
  const { data, error } = await client.rpc("list_stuck_payments");
  if (error) throw error;
  return (data ?? []).map((row) => row.checkout_session_id);
}

/**
 * Claims a Stripe event for handling; false when it was handled (or is
 * being handled) already, so a redelivery does nothing twice.
 */
export async function claimStripeEvent(
  client: Client,
  eventId: string,
  type: string,
) {
  const { data, error } = await client
    .from("stripe_events")
    .upsert({ id: eventId, type }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Gives an event back after handling failed, so Stripe's retry runs it. */
export async function releaseStripeEvent(client: Client, eventId: string) {
  const { error } = await client
    .from("stripe_events")
    .delete()
    .eq("id", eventId);
  if (error) throw error;
}
