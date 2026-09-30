import {
  cancelBooking,
  centreCancelVisit,
  recordRefund,
  rescheduleBooking,
} from "@repo/supabase";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { stripeServer } from "@/lib/stripe";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";
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

/**
 * Cancelling from the admin portal: the database acts as the admin whose
 * access token came with the request (it checks the role); the refund and
 * the e-mail go as for the client's own cancellation.
 */
export function centreCancelDeps(accessToken: string) {
  const asAdmin = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    accessToken,
  );
  return {
    ...changeVisitDeps(),
    centreCancel: (appointmentId: string) =>
      centreCancelVisit(asAdmin, appointmentId),
  };
}
