import {
  cancelWorkshop,
  refundableWorkshopPayments,
  WorkshopAdminError,
} from "@repo/supabase/workshops-admin";
import { recordWorkshopRefund } from "@repo/supabase/workshops";
import { createSupabasePublicClient } from "@repo/supabase/public";
import {
  refundThroughStripe,
  type RefundingStripe,
} from "@/features/booking/stripe-refund";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";
import { createSecretClient } from "@/lib/supabase/secret";
import { stripeServer } from "@/lib/stripe";

// The centre cancels a workshop (docs/product/workshops-plan.md, PR 2):
// the database (as the admin, who must be one) cancels every seat and says
// who is owed what; each paid seat is then given back in full through
// Stripe here, where the payments live. A refund that fails stays owed in
// the database (refund_due above refunded) and is reported.

export interface CentreCancelOutcome {
  ok: true;
  refunded: number;
  refundFailed: boolean;
}

export async function cancelWorkshopAsCentre(
  workshopId: string,
  reason: string | null,
  accessToken: string,
): Promise<CentreCancelOutcome | { ok: false; code: string }> {
  const asAdmin = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    accessToken,
  );
  let owed;
  try {
    owed = await cancelWorkshop(asAdmin, workshopId, reason);
  } catch (error) {
    if (error instanceof WorkshopAdminError)
      return { ok: false, code: error.code };
    throw error;
  }

  const db = createSecretClient();
  let refunded = 0;
  let refundFailed = false;
  for (const seat of owed) {
    try {
      for (const payment of await refundableWorkshopPayments(
        db,
        seat.registrationId,
      )) {
        const total = await refundThroughStripe(
          stripeServer() as unknown as RefundingStripe,
          payment.paymentIntentId,
          payment.amountMinor - payment.refundedMinor,
          {
            reference: seat.reference,
            idempotencyKey: `workshop-cancelled:${payment.paymentIntentId}`,
          },
        );
        await recordWorkshopRefund(db, payment.paymentIntentId, total);
      }
      refunded += 1;
    } catch (error) {
      console.error(`[workshops] refund for ${seat.reference} failed:`, error);
      refundFailed = true;
    }
  }
  return { ok: true, refunded, refundFailed };
}
