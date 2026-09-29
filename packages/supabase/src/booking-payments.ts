import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BookingError, type BookingErrorCode } from "./booking";

// Paying for a visit (docs/product/booking-plan.md, R6): tying a Stripe
// Checkout Session to the hold, and its outcome. Secret client only.

type Client = SupabaseClient<Database>;

function bookingError(error: { message: string; hint?: string | null }) {
  const known: BookingErrorCode[] = [
    "hold_expired",
    "details_required",
    "amount_mismatch",
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

export type FulfillmentOutcome =
  | "confirmed"
  | "already_confirmed"
  | "awaiting_payment"
  | "slot_lost"
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
