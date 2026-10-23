import { recordWorkshopRefund } from "@repo/supabase/workshops";
import { refundableWorkshopPayments } from "@repo/supabase/workshops-admin";
import {
  refundThroughStripe,
  type RefundingStripe,
} from "@/features/booking/stripe-refund";
import { stripeServer } from "@/lib/stripe";
import type { createSecretClient } from "@/lib/supabase/secret";

// Giving a workshop seat's money back through Stripe (server only): up to
// what is owed, from its paid payments in turn, each refund recorded on
// the payment and the registration. Throws when Stripe refuses (what was
// given back by then stays recorded; the rest stays owed for the job).

type Db = ReturnType<typeof createSecretClient>;

export async function refundRegistration(
  db: Db,
  registration: { id: string; reference: string },
  owedMinor: number,
  reason: string,
): Promise<number> {
  let left = owedMinor;
  for (const payment of await refundableWorkshopPayments(db, registration.id)) {
    if (left <= 0) break;
    const amount = Math.min(left, payment.amountMinor - payment.refundedMinor);
    const total = await refundThroughStripe(
      stripeServer() as unknown as RefundingStripe,
      payment.paymentIntentId,
      amount,
      {
        reference: registration.reference,
        idempotencyKey: `workshop-${reason}:${payment.paymentIntentId}:${payment.refundedMinor + amount}`,
      },
    );
    await recordWorkshopRefund(db, payment.paymentIntentId, total);
    left -= amount;
  }
  return owedMinor - left;
}
