import type { FulfillmentOutcome, GuestBooking } from "@repo/supabase";
import type Stripe from "stripe";

// Paying for a visit with Stripe (docs/product/booking-plan.md, R6): the
// Checkout Session asked for, and what each Stripe event does. Pure, so it
// is tested without Stripe or a database.

/** Stripe needs a session to live at least 30 minutes; one more for clocks. */
const SESSION_MINUTES = 31;

/**
 * What a visit can be paid with, whatever else is switched on in Stripe's
 * dashboard: a card (Apple Pay and Google Pay pay as one), BLIK and
 * Przelewy24. Not Klarna, Link or other later methods (#27). A filter on
 * the dashboard's methods; the SDK's types do not list it for Checkout yet.
 */
export const PAYMENT_METHODS = ["card", "blik", "p24"] as const;

export type CheckoutSessionParams = Stripe.Checkout.SessionCreateParams & {
  allowed_payment_method_types: string[];
};

export function checkoutSessionParams({
  booking,
  returnUrl,
  visitLabel,
  now = new Date(),
}: {
  booking: GuestBooking;
  /** Absolute URL of the return page (without the query). */
  returnUrl: string;
  /** "czwartek, 2 października 2030, godz. 10:00" */
  visitLabel: string;
  now?: Date;
}): CheckoutSessionParams {
  const metadata = { appointment_reference: booking.reference };
  return {
    ui_mode: "elements",
    mode: "payment",
    allowed_payment_method_types: [...PAYMENT_METHODS],
    // Stripe needs the e-mail for the receipt; nothing else of the client
    // (their name, phone or notes) goes to Stripe.
    customer_email: booking.details?.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: booking.currencyCode.toLowerCase(),
          unit_amount: booking.priceMinor,
          product_data: {
            name: booking.serviceName,
            description: [booking.specialistName, visitLabel]
              .filter(Boolean)
              .join(" · "),
          },
        },
      },
    ],
    expires_at: Math.floor(now.getTime() / 1000) + SESSION_MINUTES * 60,
    return_url: `${returnUrl}?sesja={CHECKOUT_SESSION_ID}`,
    metadata,
    payment_intent_data: {
      description: `Wizyta ${booking.reference}`,
      metadata,
    },
  };
}

export interface PaymentDeps {
  fulfill: (
    sessionId: string,
    paid: boolean,
    paymentIntentId: string | null,
  ) => Promise<FulfillmentOutcome>;
  fail: (sessionId: string, reason: "failed" | "expired") => Promise<void>;
  /**
   * Gives back a payment that did not count (the time was taken meanwhile,
   * the visit was paid already or cancelled, or the price changed).
   */
  refundPayment: (
    sessionId: string,
    paymentIntentId: string,
    amountMinor: number,
    reference: string,
  ) => Promise<void>;
  recordRefund: (
    paymentIntentId: string,
    refundedMinor: number,
  ) => Promise<unknown>;
  /** The visit is confirmed (again, possibly): send its e-mail, once. */
  onConfirmed?: (reference: string) => Promise<unknown>;
  /**
   * A workshop seat's payments (features/workshops/payment.ts): a session
   * whose metadata names a workshop registration is settled there; a
   * failure or a refund goes to both (each skips what is not its own).
   */
  workshop?: {
    settle: (session: Stripe.Checkout.Session) => Promise<unknown>;
    fail: (sessionId: string, reason: "failed" | "expired") => Promise<void>;
    recordRefund: (
      paymentIntentId: string,
      refundedMinor: number,
    ) => Promise<unknown>;
  };
  /** A dispute (a chargeback) opened or closed: the history and the admins. */
  recordDispute: (dispute: DisputeRecord) => Promise<unknown>;
}

export interface DisputeRecord {
  paymentIntentId: string;
  disputeId: string;
  /** Stripe's: `needs_response`, `under_review`, `won`, `lost`… */
  status: string;
  amountMinor: number;
  /** Stripe's: `fraudulent`, `product_not_received`… */
  reason: string;
  closed: boolean;
}

function paymentIntentId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

/**
 * Settles a completed session: confirms (paid or waiting for the money),
 * or refunds when the time was lost. Also used by the return page, which
 * may run before the webhook.
 */
export async function settleSession(
  session: Pick<
    Stripe.Checkout.Session,
    "id" | "payment_status" | "payment_intent" | "metadata" | "amount_total"
  >,
  deps: Pick<PaymentDeps, "fulfill" | "refundPayment" | "onConfirmed">,
) {
  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  const intent = paymentIntentId(session.payment_intent);
  const outcome = await deps.fulfill(session.id, paid, intent);
  const reference = session.metadata?.appointment_reference;
  // The database answers this once per payment, so opening the return page
  // again never refunds a payment that confirmed its visit.
  if (
    (outcome === "slot_lost" || outcome === "refund_payment") &&
    paid &&
    intent &&
    session.amount_total
  ) {
    await deps.refundPayment(
      session.id,
      intent,
      session.amount_total,
      reference ?? session.id,
    );
  }
  if (
    reference &&
    (outcome === "confirmed" || outcome === "already_confirmed")
  ) {
    await deps.onConfirmed?.(reference);
  }
  return outcome;
}

export async function handleStripeEvent(
  event: Stripe.Event,
  deps: PaymentDeps,
) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      if (deps.workshop && event.data.object.metadata?.workshop_reference) {
        await deps.workshop.settle(event.data.object);
        return;
      }
      await settleSession(event.data.object, deps);
      return;
    case "checkout.session.async_payment_failed":
      await deps.fail(event.data.object.id, "failed");
      await deps.workshop?.fail(event.data.object.id, "failed");
      return;
    case "checkout.session.expired":
      await deps.fail(event.data.object.id, "expired");
      await deps.workshop?.fail(event.data.object.id, "expired");
      return;
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const dispute = event.data.object;
      const intent = paymentIntentId(dispute.payment_intent);
      if (!intent) return;
      await deps.recordDispute({
        paymentIntentId: intent,
        disputeId: dispute.id,
        status: dispute.status,
        amountMinor: dispute.amount,
        reason: dispute.reason,
        closed: event.type === "charge.dispute.closed",
      });
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const intent = paymentIntentId(charge.payment_intent);
      if (intent) {
        await deps.recordRefund(intent, charge.amount_refunded);
        await deps.workshop?.recordRefund(intent, charge.amount_refunded);
      }
      return;
    }
    default:
      return;
  }
}

/**
 * Whether an event belongs to the server's Stripe key: a test event never
 * changes live data, nor a live one test data (R2), even if the webhook's
 * secret were the same.
 */
export function eventFitsKey(livemode: boolean, secretKey: string | undefined) {
  if (!secretKey) return false;
  const live = /^(sk|rk)_live_/.test(secretKey);
  return livemode === live;
}

/**
 * A payment still pending hours later (its event lost, R7), as Stripe has
 * it now: settled (paid), freed (never paid, or the payment failed), or
 * still on its way.
 */
export function stuckSessionAction(
  session: Pick<Stripe.Checkout.Session, "status" | "payment_status"> & {
    payment_intent: string | { status: string } | null;
  },
): "settle" | "expire" | "fail" | "wait" {
  if (session.status === "expired") return "expire";
  if (session.status !== "complete") return "wait";
  if (session.payment_status !== "unpaid") return "settle";
  const status =
    typeof session.payment_intent === "object"
      ? session.payment_intent?.status
      : undefined;
  return status === "canceled" || status === "requires_payment_method"
    ? "fail"
    : "wait";
}
