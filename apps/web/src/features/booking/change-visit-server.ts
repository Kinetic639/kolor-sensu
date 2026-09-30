import { cancelBooking, recordRefund, rescheduleBooking } from "@repo/supabase";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";
import type { ChangeVisitDeps } from "./change-visit";
import { sendVisitChangeEmail } from "./email/confirmation-server";

// Changing a visit: the real dependencies (the secret client, Stripe,
// Resend). Server only.

export function changeVisitDeps(): ChangeVisitDeps {
  const db = createSecretClient();
  return {
    cancel: (token) => cancelBooking(db, token),
    refund: async (paymentIntentId, amountMinor, reference) => {
      // One refund per cancelled visit, however often this runs.
      const refund = await stripeServer().refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: amountMinor,
          reason: "requested_by_customer",
          metadata: { appointment_reference: reference },
        },
        { idempotencyKey: `cancel:${reference}` },
      );
      return refund.amount;
    },
    recordRefund: (paymentIntentId, refundedMinor) =>
      recordRefund(db, paymentIntentId, refundedMinor),
    reschedule: (token, startsAt) => rescheduleBooking(db, token, startsAt),
    notify: sendVisitChangeEmail,
  };
}
