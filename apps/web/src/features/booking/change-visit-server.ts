import {
  cancelBooking,
  centreCancelVisit,
  centreRefundVisit,
  centreRescheduleVisit,
  centreSettleVisit,
  recordRefund,
  rescheduleBooking,
} from "@repo/supabase";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { getBookingWindow } from "@/lib/public-data";
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
    refund: async (
      paymentIntentId,
      amountMinor,
      { reference, idempotencyKey },
    ) => {
      const stripe = stripeServer();
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: amountMinor,
          reason: "requested_by_customer",
          metadata: { appointment_reference: reference },
        },
        { idempotencyKey },
      );
      // All given back on the payment so far (there may be several refunds).
      const chargeId =
        typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
      if (!chargeId) return refund.amount;
      const charge = await stripe.charges.retrieve(chargeId);
      return charge.amount_refunded;
    },
    recordRefund: (paymentIntentId, refundedMinor) =>
      recordRefund(db, paymentIntentId, refundedMinor),
    reschedule: (token, startsAt) => rescheduleBooking(db, token, startsAt),
    notify: sendVisitChangeEmail,
  };
}

/**
 * The centre's own changes from the admin portal: the database acts as the
 * admin whose access token came with the request (it checks the role); the
 * refunds and the e-mails go as for the client's own changes.
 */
export async function centreChangeDeps(accessToken: string) {
  const asAdmin = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    accessToken,
  );
  const window = await getBookingWindow();
  return {
    ...changeVisitDeps(),
    timeZone: window?.timeZone ?? "Europe/Warsaw",
    centreCancel: (
      appointmentId: string,
      choice: { refundMinor: number | null; reason: string | null },
    ) => centreCancelVisit(asAdmin, appointmentId, choice),
    centreRefund: (
      appointmentId: string,
      refundMinor: number,
      reason: string | null,
    ) => centreRefundVisit(asAdmin, appointmentId, refundMinor, reason),
    centreSettle: (appointmentId: string) =>
      centreSettleVisit(asAdmin, appointmentId),
    centreReschedule: (
      appointmentId: string,
      move: Parameters<typeof centreRescheduleVisit>[2],
    ) => centreRescheduleVisit(asAdmin, appointmentId, move),
  };
}
