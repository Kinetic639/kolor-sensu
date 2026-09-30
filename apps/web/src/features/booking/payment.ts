import type { FulfillmentOutcome, GuestBooking } from "@repo/supabase";
import type Stripe from "stripe";

// Paying for a visit with Stripe (docs/product/booking-plan.md, R6): the
// Checkout Session asked for, and what each Stripe event does. Pure, so it
// is tested without Stripe or a database.

/** Stripe needs a session to live at least 30 minutes; one more for clocks. */
const SESSION_MINUTES = 31;

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
}): Stripe.Checkout.SessionCreateParams {
  const metadata = { appointment_reference: booking.reference };
  return {
    ui_mode: "elements",
    mode: "payment",
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
  /** Gives the money back for a time that was taken meanwhile. */
  refundLostSlot: (sessionId: string, paymentIntentId: string) => Promise<void>;
  recordRefund: (
    paymentIntentId: string,
    refundedMinor: number,
  ) => Promise<unknown>;
  /** The visit is confirmed (again, possibly): send its e-mail, once. */
  onConfirmed?: (reference: string) => Promise<unknown>;
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
    "id" | "payment_status" | "payment_intent" | "metadata"
  >,
  deps: Pick<PaymentDeps, "fulfill" | "refundLostSlot" | "onConfirmed">,
) {
  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  const intent = paymentIntentId(session.payment_intent);
  const outcome = await deps.fulfill(session.id, paid, intent);
  if (outcome === "slot_lost" && paid && intent) {
    await deps.refundLostSlot(session.id, intent);
  }
  const reference = session.metadata?.appointment_reference;
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
      await settleSession(event.data.object, deps);
      return;
    case "checkout.session.async_payment_failed":
      await deps.fail(event.data.object.id, "failed");
      return;
    case "checkout.session.expired":
      await deps.fail(event.data.object.id, "expired");
      return;
    case "charge.refunded": {
      const charge = event.data.object;
      const intent = paymentIntentId(charge.payment_intent);
      if (intent) await deps.recordRefund(intent, charge.amount_refunded);
      return;
    }
    default:
      return;
  }
}
