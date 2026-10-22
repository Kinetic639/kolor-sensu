import type {
  WorkshopFulfillment,
  WorkshopRegistration,
} from "@repo/supabase/workshops";
import type Stripe from "stripe";
import {
  PAYMENT_METHODS,
  type CheckoutSessionParams,
} from "@/features/booking/payment";

// Paying for a workshop seat with Stripe (docs/product/workshops-plan.md,
// PR 4): the Checkout Session asked for, as for a visit (card, BLIK,
// Przelewy24), and what a completed one does. Pure, so it is tested without
// Stripe or a database. The session's metadata says it is a workshop's, so
// the webhook settles it here and not as a visit.

/** Stripe needs a session to live at least 30 minutes; one more for clocks. */
const SESSION_MINUTES = 31;

export const WORKSHOP_METADATA_KEY = "workshop_reference";

export function workshopCheckoutParams({
  registration,
  returnUrl,
  dateLabel,
  now = new Date(),
}: {
  registration: Pick<
    WorkshopRegistration,
    "reference" | "priceMinor" | "currencyCode" | "workshopTitle" | "details"
  >;
  /** Absolute URL of the return page (without the query). */
  returnUrl: string;
  /** "wtorek, 12 listopada 2030, 17:00–19:00" */
  dateLabel: string;
  now?: Date;
}): CheckoutSessionParams {
  const metadata = { [WORKSHOP_METADATA_KEY]: registration.reference };
  return {
    ui_mode: "elements",
    mode: "payment",
    allowed_payment_method_types: [...PAYMENT_METHODS],
    // Only the e-mail, for the receipt; nothing else of the participant.
    customer_email: registration.details?.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: registration.currencyCode.toLowerCase(),
          unit_amount: registration.priceMinor,
          product_data: {
            name: `Warsztat: ${registration.workshopTitle}`,
            description: dateLabel,
          },
        },
      },
    ],
    expires_at: Math.floor(now.getTime() / 1000) + SESSION_MINUTES * 60,
    return_url: `${returnUrl}?sesja={CHECKOUT_SESSION_ID}`,
    metadata,
    payment_intent_data: {
      description: `Warsztat ${registration.reference}`,
      metadata,
    },
  };
}

/** Whether a Stripe session is a workshop seat's. */
export function isWorkshopSession(
  session: Pick<Stripe.Checkout.Session, "metadata">,
) {
  return Boolean(session.metadata?.[WORKSHOP_METADATA_KEY]);
}

export interface WorkshopPaymentDeps {
  fulfill: (
    sessionId: string,
    paid: boolean,
    paymentIntentId: string | null,
  ) => Promise<WorkshopFulfillment>;
  fail: (sessionId: string, reason: "failed" | "expired") => Promise<void>;
  /** Gives the money back for a seat that went meanwhile. */
  refundLostSeat: (sessionId: string, paymentIntentId: string) => Promise<void>;
  recordRefund: (
    paymentIntentId: string,
    refundedMinor: number,
  ) => Promise<unknown>;
  /** The seat is confirmed (again, possibly): send its e-mail, once. */
  onConfirmed?: (reference: string) => Promise<unknown>;
}

function intentOf(value: string | { id: string } | null) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

/**
 * Settles a completed session: confirms the seat, or refunds a lost one.
 * Also used by the return page, which may run before the webhook.
 */
export async function settleWorkshopSession(
  session: Pick<
    Stripe.Checkout.Session,
    "id" | "payment_status" | "payment_intent" | "metadata"
  >,
  deps: Pick<WorkshopPaymentDeps, "fulfill" | "refundLostSeat" | "onConfirmed">,
) {
  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  const intent = intentOf(session.payment_intent);
  const outcome = await deps.fulfill(session.id, paid, intent);
  if (outcome === "seat_lost" && paid && intent) {
    await deps.refundLostSeat(session.id, intent);
  }
  const reference = session.metadata?.[WORKSHOP_METADATA_KEY];
  if (
    reference &&
    (outcome === "confirmed" || outcome === "already_confirmed")
  ) {
    await deps.onConfirmed?.(reference);
  }
  return outcome;
}
