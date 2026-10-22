import {
  attachWorkshopCheckout,
  failWorkshopCheckout,
  fulfillWorkshopCheckout,
  getWorkshopRegistration,
  pendingWorkshopCheckout,
  recordWorkshopRefund,
  WorkshopError,
} from "@repo/supabase/workshops";
import type Stripe from "stripe";
import { expireSession } from "@/features/booking/payment-server";
import {
  refundThroughStripe,
  type RefundingStripe,
} from "@/features/booking/stripe-refund";
import { getBookingWindow } from "@/lib/public-data";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";
import { sendWorkshopEmail } from "./email/send";
import {
  settleWorkshopSession,
  workshopCheckoutParams,
  type WorkshopPaymentDeps,
} from "./payment";
import { workshopDateLabel, workshopTimeLabel } from "./workshop-view";

// A workshop seat's payment, server side: the settling's real dependencies
// (the database, Stripe, the e-mail) and the Checkout Session for a seat.

export function workshopPaymentDeps(): WorkshopPaymentDeps {
  const db = createSecretClient();
  return {
    fulfill: (sessionId, paid, intent) =>
      fulfillWorkshopCheckout(db, sessionId, paid, intent),
    fail: (sessionId, reason) => failWorkshopCheckout(db, sessionId, reason),
    refundLostSeat: async (sessionId, paymentIntentId) => {
      const session =
        await stripeServer().checkout.sessions.retrieve(sessionId);
      const refunded = await refundThroughStripe(
        stripeServer() as unknown as RefundingStripe,
        paymentIntentId,
        session.amount_total ?? 0,
        {
          reference: session.metadata?.workshop_reference ?? sessionId,
          idempotencyKey: `seat-lost:${sessionId}`,
        },
      );
      await recordWorkshopRefund(db, paymentIntentId, refunded);
    },
    recordRefund: (paymentIntentId, refundedMinor) =>
      recordWorkshopRefund(db, paymentIntentId, refundedMinor),
    onConfirmed: (reference) => sendWorkshopEmail(reference, "confirmation"),
  };
}

/** For the Stripe webhook (features/booking/payment.ts, `workshop`). */
export function webhookWorkshopDeps() {
  const deps = workshopPaymentDeps();
  return {
    settle: (session: Stripe.Checkout.Session) =>
      settleWorkshopSession(session, deps),
    fail: deps.fail,
    recordRefund: deps.recordRefund,
  };
}

/**
 * The seat's open Checkout Session, or a new one at the seat's price from
 * the database; null when the seat is free (nothing to pay). Refusals as
 * WorkshopError (hold_expired, details_required).
 */
export async function workshopCheckout(
  token: string,
  returnUrl: string,
): Promise<Stripe.Checkout.Session | null> {
  const db = createSecretClient();
  const registration = await getWorkshopRegistration(db, token);
  if (!registration) throw new WorkshopError("hold_expired", "No registration");
  if (registration.priceMinor === 0) return null;

  const pending = await pendingWorkshopCheckout(db, token);
  if (pending) {
    const session = await stripeServer()
      .checkout.sessions.retrieve(pending)
      .catch(() => null);
    // Reused while open, for the same e-mail and amount.
    if (
      session?.status === "open" &&
      session.customer_email === registration.details?.email &&
      session.amount_total === registration.priceMinor
    ) {
      return session;
    }
    if (session?.status === "open") await expireSession(session.id);
  }

  const timeZone = (await getBookingWindow())?.timeZone ?? "Europe/Warsaw";
  const session = await stripeServer().checkout.sessions.create(
    workshopCheckoutParams({
      registration,
      returnUrl,
      dateLabel: `${workshopDateLabel(registration.startsAt, timeZone)}, ${workshopTimeLabel(registration.startsAt, registration.endsAt, timeZone)}`,
    }),
    // One session per seat and minute, even if the button is pressed twice.
    {
      idempotencyKey: `workshop-checkout:${registration.reference}:${registration.priceMinor}:${Math.floor(Date.now() / 60_000)}`,
    },
  );
  try {
    await attachWorkshopCheckout(db, token, {
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
      amountMinor: session.amount_total ?? 0,
      currencyCode: session.currency ?? "",
    });
  } catch (error) {
    await expireSession(session.id);
    throw error;
  }
  return session;
}
