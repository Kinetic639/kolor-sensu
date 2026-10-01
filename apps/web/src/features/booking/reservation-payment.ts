"use server";

import {
  acceptBookingTerms,
  attachReservationPayment,
  BookingError,
  getBooking,
  pendingReservationPayment,
} from "@repo/supabase";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";
import { siteUrl } from "./email/confirmation-server";
import { visitByLinkToken } from "./guest-visit";
import { checkoutSessionParams } from "./payment";
import { expireSession } from "./payment-server";
import { visitChanges } from "./visit-changes";
import { visitLabel } from "./visit-label";

// Paying a reservation later, from its link (docs/product/booking-plan.md,
// R11): the consents first when the centre booked it (the client has not
// given them yet), then a Stripe Checkout Session for its price from the
// database, shown on /wizyta/<token>/platnosc. Stripe returns to the
// visit's page, which settles the payment as the webhook does.

export type ReservationPaymentState =
  | { status: "idle" }
  | {
      status: "invalid";
      errors: { acceptTerms?: string; acceptPrivacy?: string };
    };

const visitPath = (token: string) => `/wizyta/${token}` as Route;
const paymentPath = (token: string) => `/wizyta/${token}/platnosc` as Route;

export async function payReservationAction(
  _previous: ReservationPaymentState,
  form: FormData,
): Promise<ReservationPaymentState> {
  const token = String(form.get("token") ?? "");
  const visit = await visitByLinkToken(token);
  if (!visit) redirect("/umow-wizyte" as Route);
  if (!visitChanges(visit.booking, visit.policy).pay.allowed) {
    redirect(visitPath(token));
  }
  const db = createSecretClient();

  if (!visit.booking.details) {
    const errors = {
      ...(form.get("acceptTerms") === "on"
        ? {}
        : { acceptTerms: "Zaakceptuj regulamin rezerwacji." }),
      ...(form.get("acceptPrivacy") === "on"
        ? {}
        : {
            acceptPrivacy: "Potwierdź zapoznanie się z polityką prywatności.",
          }),
    };
    if (Object.keys(errors).length > 0) return { status: "invalid", errors };
    try {
      await acceptBookingTerms(db, token);
    } catch (error) {
      if (error instanceof BookingError) redirect(visitPath(token));
      throw error;
    }
  }

  // An open session is reused.
  const pending = await pendingReservationPayment(db, token);
  if (pending) {
    const session = await stripeServer()
      .checkout.sessions.retrieve(pending)
      .catch(() => null);
    if (session?.status === "open") redirect(paymentPath(token));
  }

  const booking = await getBooking(db, token);
  if (!booking?.details) redirect(visitPath(token));
  const session = await stripeServer().checkout.sessions.create(
    checkoutSessionParams({
      booking,
      returnUrl: `${siteUrl()}${visitPath(token)}`,
      visitLabel: visitLabel(booking.startsAt, visit.timeZone),
    }),
    {
      idempotencyKey: `reservation:${booking.reference}:${Math.floor(Date.now() / 60_000)}`,
    },
  );
  try {
    await attachReservationPayment(db, token, {
      sessionId: session.id,
      amountMinor: session.amount_total ?? 0,
      currencyCode: session.currency ?? "",
    });
  } catch (error) {
    await expireSession(session.id);
    if (error instanceof BookingError) redirect(visitPath(token));
    throw error;
  }
  redirect(paymentPath(token));
}
