import {
  failCheckoutSession,
  fulfillCheckoutSession,
  listStuckPayments,
  recordDispute,
  recordRefund,
} from "@repo/supabase";
import type Stripe from "stripe";
import { createSecretClient } from "@/lib/supabase/secret";
import { stripeServer } from "@/lib/stripe";
import { sendVisitConfirmation } from "./email/confirmation-server";
import { settleSession, stuckSessionAction, type PaymentDeps } from "./payment";
import { refundThroughStripe, type RefundingStripe } from "./stripe-refund";

// The payment steps' real dependencies: the database (secret client) and
// Stripe. Server only.

export function paymentDeps(): PaymentDeps {
  const db = createSecretClient();
  return {
    fulfill: (sessionId, paid, intent) =>
      fulfillCheckoutSession(db, sessionId, paid, intent),
    fail: (sessionId, reason) => failCheckoutSession(db, sessionId, reason),
    refundPayment: async (
      sessionId,
      paymentIntentId,
      amountMinor,
      reference,
    ) => {
      const refunded = await refundThroughStripe(
        stripeServer() as unknown as RefundingStripe,
        paymentIntentId,
        amountMinor,
        { reference, idempotencyKey: `slot-lost:${sessionId}` },
      );
      await recordRefund(db, paymentIntentId, refunded);
    },
    recordRefund: (paymentIntentId, refundedMinor) =>
      recordRefund(db, paymentIntentId, refundedMinor),
    onConfirmed: sendVisitConfirmation,
    recordDispute: (dispute) => recordDispute(db, dispute),
    paymentReference: async (paymentIntentId) => {
      try {
        const { metadata } =
          await stripeServer().paymentIntents.retrieve(paymentIntentId);
        return (
          metadata.appointment_reference ?? metadata.workshop_reference ?? null
        );
      } catch (error) {
        console.error("[booking] reading a payment's reference failed:", error);
        return null;
      }
    },
  };
}

/**
 * The payments still pending two hours on (R7): each asked of Stripe and
 * settled, or freed, as its lost event would have. How many changed; never
 * throws (one that fails waits for the next run).
 */
export async function checkStuckPayments() {
  const deps = paymentDeps();
  let changed = 0;
  let sessions: string[];
  try {
    sessions = await listStuckPayments(createSecretClient());
  } catch (error) {
    console.error("[booking] listing stuck payments failed:", error);
    return 0;
  }
  for (const id of sessions) {
    try {
      const session = await stripeServer().checkout.sessions.retrieve(id, {
        expand: ["payment_intent"],
      });
      const action = stuckSessionAction(session);
      if (action === "wait") continue;
      if (action === "settle") await settleSession(session, deps);
      else await deps.fail(id, action === "expire" ? "expired" : "failed");
      changed += 1;
    } catch (error) {
      console.error(`[booking] checking stuck payment ${id} failed:`, error);
    }
  }
  return changed;
}

/** Expires a Checkout Session still open (e.g. the client gave the time back). */
export async function expireSession(sessionId: string) {
  try {
    const session = await stripeServer().checkout.sessions.retrieve(sessionId);
    if (session.status === "open") {
      await stripeServer().checkout.sessions.expire(sessionId);
    }
  } catch (error) {
    console.error("[booking] expiring a Checkout Session failed:", error);
  }
}

export type { Stripe };
