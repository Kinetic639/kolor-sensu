// Giving money back through Stripe (R9, R12, R14): the refund, then all
// refunded on the payment so far (there may be several refunds). When
// Stripe refuses because it holds less to give back than asked (a refund
// made in its dashboard whose webhook never came), what it has given back
// is the answer: the database then catches up instead of the visit being
// owed for ever. Any other refusal goes on as an error.

interface ChargeLike {
  amount: number;
  amount_refunded: number;
}

/** As much of the Stripe client as this needs (a fake one in the tests). */
export interface RefundingStripe {
  refunds: {
    create(
      params: {
        payment_intent: string;
        amount: number;
        reason: "requested_by_customer";
        metadata: Record<string, string>;
      },
      options: { idempotencyKey: string },
    ): Promise<{ amount: number; charge: string | { id: string } | null }>;
  };
  charges: { retrieve(id: string): Promise<ChargeLike> };
  paymentIntents: {
    retrieve(
      id: string,
      params: { expand: string[] },
    ): Promise<{ latest_charge: string | ChargeLike | null }>;
  };
}

function refusedByStripe(error: unknown) {
  return (
    error instanceof Error &&
    (error as { type?: string }).type === "StripeInvalidRequestError"
  );
}

export async function refundThroughStripe(
  stripe: RefundingStripe,
  paymentIntentId: string,
  amountMinor: number,
  { reference, idempotencyKey }: { reference: string; idempotencyKey: string },
): Promise<number> {
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amountMinor,
        reason: "requested_by_customer",
        metadata: { appointment_reference: reference },
      },
      { idempotencyKey },
    );
    const chargeId =
      typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
    if (!chargeId) return refund.amount;
    return (await stripe.charges.retrieve(chargeId)).amount_refunded;
  } catch (error) {
    if (!refusedByStripe(error)) throw error;
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge =
      typeof intent.latest_charge === "string"
        ? await stripe.charges.retrieve(intent.latest_charge)
        : intent.latest_charge;
    // Less left than asked, and some given back: given back elsewhere.
    if (
      charge &&
      charge.amount_refunded > 0 &&
      charge.amount - charge.amount_refunded < amountMinor
    ) {
      console.warn(
        `[booking] ${reference}: Stripe gave back ${charge.amount_refunded} already; recording it`,
      );
      return charge.amount_refunded;
    }
    throw error;
  }
}
