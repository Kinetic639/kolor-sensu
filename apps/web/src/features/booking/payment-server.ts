import {
  failCheckoutSession,
  fulfillCheckoutSession,
  recordRefund,
} from "@repo/supabase";
import type Stripe from "stripe";
import { createSecretClient } from "@/lib/supabase/secret";
import { stripeServer } from "@/lib/stripe";
import { sendVisitConfirmation } from "./email/confirmation-server";
import type { PaymentDeps } from "./payment";
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
  };
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
