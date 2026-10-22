"use server";

import {
  attachCheckoutSession,
  BookingError,
  getBooking,
  holdSlot,
  pendingCheckoutSession,
  releaseHold,
  reserveHold,
  saveBookingDetails,
} from "@repo/supabase";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  applyDiscountCode,
  confirmFreeBooking,
  discountRefusal,
  removeDiscountCode,
} from "@repo/supabase/discount-codes";
import { attachVisitIntake } from "@repo/supabase/intakes";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getBookingWindow } from "@/lib/public-data";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";
import {
  INTENT_FIELD,
  PAY_LATER,
  readDetailsForm,
  type DetailsFormErrors,
  type DetailsFormValues,
} from "./details-form-data";
import { discountProblem } from "./discount";
import {
  claimReservationEmail,
  sendVisitConfirmation,
} from "./email/confirmation-server";
import { clientIp, turnstileKeys, verifyTurnstile, visitorKey } from "./guards";
import { clearHoldToken, readHoldToken, saveHoldToken } from "./hold-cookie";
import { clearIntake, readIntake } from "./intake-cookie";
import { loadWizard } from "./load-wizard";
import { checkoutSessionParams } from "./payment";
import { expireSession } from "./payment-server";
import {
  bookingHref,
  bookingNoticeHref,
  loadBookingParams,
} from "./search-params";
import { visitLabel } from "./visit-label";
import { signUpForNewsletter } from "@/features/newsletter/signup-server";

// The booking steps that write. The forms carry only the wizard's choices
// and the client's details; the time's instant, the offer and the price
// are worked out again here and in the database, never taken from a form.

const DETAILS_PATH = "/umow-wizyte/dane" as Route;
const PAYMENT_PATH = "/umow-wizyte/platnosc" as Route;

function formParams(formData: FormData) {
  return loadBookingParams(
    new URLSearchParams(
      [...formData.entries()].flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value] as [string, string]] : [],
      ),
    ),
  );
}

export async function holdTimeAction(formData: FormData) {
  const wizard = await loadWizard(formParams(formData));
  if (!wizard) redirect("/umow-wizyte");
  const chosen =
    wizard.view.panel.kind === "slots" ? wizard.view.panel.chosen : null;
  if (!chosen) redirect(bookingNoticeHref(wizard.params, "termin-zajety"));

  // A person, not a script: Cloudflare Turnstile, then the visitor's limit.
  const ip = clientIp(await headers());
  const human = await verifyTurnstile(
    String(formData.get("cf-turnstile-response") ?? ""),
    ip,
    turnstileKeys().secretKey,
  );
  if (!human) {
    redirect(bookingNoticeHref(wizard.params, "weryfikacja", true));
  }

  const client = createSecretClient();
  // One visitor, one held time: choosing again gives the earlier one back.
  const previous = await readHoldToken();
  if (previous) await releaseHold(client, previous).catch(() => false);

  try {
    const held = await holdSlot(client, {
      serviceSlug: wizard.params.usluga!,
      specialistSlug: wizard.params.specjalista!,
      mode: wizard.params.forma === "online" ? "online" : "in_person",
      locationSlug:
        wizard.params.forma === "stacjonarnie"
          ? (wizard.params.lokalizacja ?? undefined)
          : undefined,
      startsAt: chosen.startsAt,
      clientKey: visitorKey(ip, process.env.SUPABASE_SECRET_KEY ?? ""),
    });
    await saveHoldToken(held.accessToken);
  } catch (error) {
    if (error instanceof BookingError && error.code === "too_many_holds") {
      redirect(bookingNoticeHref(wizard.params, "za-duzo-prob"));
    }
    if (error instanceof BookingError && error.code !== "unknown") {
      redirect(bookingNoticeHref(wizard.params, "termin-zajety"));
    }
    throw error;
  }
  redirect(DETAILS_PATH);
}

/** "Zmień termin": gives the held time back and returns to the wizard. */
export async function releaseHoldAction() {
  const token = await readHoldToken();
  if (token) {
    const db = createSecretClient();
    // A payment started for this time stops too.
    const session = await pendingCheckoutSession(db, token).catch(() => null);
    if (session) await expireSession(session);
    await releaseHold(db, token).catch(() => false);
    await clearHoldToken();
  }
  redirect(bookingHref({}));
}

/** The site's own address, for Stripe's return link. */
async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_WEB_URL;
  if (configured) return configured.replace(/\/$/, "");
  const all = await headers();
  const host = all.get("x-forwarded-host") ?? all.get("host");
  const proto = all.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * "Przejdź do płatności": a Stripe Checkout Session for the held visit,
 * with its price from the database; an open one is reused.
 */
export async function startPaymentAction() {
  const token = await readHoldToken();
  if (!token) redirect(EXPIRED);
  return goToPayment(token);
}

async function goToPayment(token: string): Promise<never> {
  const db = createSecretClient();

  const pending = await pendingCheckoutSession(db, token);
  if (pending) {
    const session = await stripeServer()
      .checkout.sessions.retrieve(pending)
      .catch(() => null);
    const current = await getBooking(db, token);
    // Reused while open and for the same e-mail; otherwise a new one.
    if (
      session?.status === "open" &&
      session.customer_email === current?.details?.email
    ) {
      redirect(PAYMENT_PATH);
    }
    if (session?.status === "open") await expireSession(session.id);
  }

  const booking = await getBooking(db, token);
  if (!booking || booking.status !== "held") redirect(EXPIRED);
  if (!booking.details) redirect(DETAILS_PATH);
  if (booking.priceMinor === 0) return confirmFree(token, booking.reference);
  const timeZone = (await getBookingWindow())?.timeZone ?? "Europe/Warsaw";

  const session = await stripeServer().checkout.sessions.create(
    checkoutSessionParams({
      booking,
      returnUrl: `${await siteOrigin()}/umow-wizyte/potwierdzenie`,
      visitLabel: visitLabel(booking.startsAt, timeZone),
    }),
    // One session per visit and minute, even if the button is pressed twice.
    {
      idempotencyKey: `checkout:${booking.reference}:${Math.floor(Date.now() / 60_000)}`,
    },
  );
  try {
    await attachCheckoutSession(db, token, {
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
      amountMinor: session.amount_total ?? 0,
      currencyCode: session.currency ?? "",
    });
  } catch (error) {
    await expireSession(session.id);
    if (error instanceof BookingError && error.code === "hold_expired") {
      redirect(EXPIRED);
    }
    throw error;
  }
  redirect(PAYMENT_PATH);
}

export type DetailsFormState =
  | { status: "idle" }
  | { status: "saved" }
  | {
      status: "invalid";
      errors: DetailsFormErrors;
      values: DetailsFormValues;
      message?: string;
    };

const EXPIRED = bookingNoticeHref(
  loadBookingParams(new URLSearchParams()),
  "rezerwacja-wygasla",
);

/** The client's details, saved to their held visit (useActionState). */
export async function saveDetailsAction(
  _previous: DetailsFormState,
  formData: FormData,
): Promise<DetailsFormState> {
  const token = await readHoldToken();
  if (!token) redirect(EXPIRED);

  const form = readDetailsForm(formData);
  if (!form.ok && "bot" in form) {
    // Say nothing useful to a bot.
    return { status: "idle" };
  }
  if (!form.ok) return { status: "invalid", ...form };

  try {
    const db = createSecretClient();
    // The questionnaire, where the service asks for it, tied to the visit.
    await attachVisitIntake(db, token, (await readIntake())?.token ?? null);
    await saveBookingDetails(db, token, form.details);
    if (form.newsletter) {
      // Its own consent, confirmed by its own link; the visit goes on
      // whatever happens to it.
      const ip = clientIp(await headers());
      const { email } = form.details;
      after(() =>
        signUpForNewsletter(email, "booking", ip).catch((error: unknown) => {
          console.error("[booking] the newsletter sign-up failed:", error);
        }),
      );
    }
  } catch (error) {
    if (error instanceof BookingError && error.code === "intake_required") {
      return {
        status: "invalid",
        errors: {},
        values: {
          ...form.details,
          notes: form.details.notes ?? "",
          acceptTerms: true,
          acceptPrivacy: true,
          newsletter: form.newsletter,
        },
        message:
          "Ta konsultacja zaczyna się od krótkiego testu. Wróć do wyboru usługi, wypełnij go i wybierz termin ponownie.",
      };
    }
    if (error instanceof BookingError && error.code === "hold_expired") {
      redirect(EXPIRED);
    }
    if (error instanceof BookingError) {
      return {
        status: "invalid",
        errors: {},
        values: {
          ...form.details,
          notes: form.details.notes ?? "",
          acceptTerms: true,
          acceptPrivacy: true,
          newsletter: form.newsletter,
        },
        message: "Sprawdź, proszę, swoje dane i spróbuj ponownie.",
      };
    }
    throw error;
  }
  // Saved (with its questionnaire, the cookie is done with): reserved to
  // pay later, or straight on to the payment.
  await clearIntake();
  if (formData.get(INTENT_FIELD) === PAY_LATER) {
    // Nothing to pay later when the code covers it all.
    const current = await getBooking(createSecretClient(), token);
    if (current?.priceMinor === 0) return confirmFree(token, current.reference);
    return reserveForLater(token);
  }
  return goToPayment(token);
}

/**
 * "Zarezerwuj, zapłacę później" (R11): the visit is reserved until its
 * payment is due, the link to pay goes by e-mail, and the visit's page
 * opens by that same link. Too close to the visit, it is paid now.
 */
async function reserveForLater(token: string): Promise<never> {
  const db = createSecretClient();
  const pending = await pendingCheckoutSession(db, token);
  let reference: string;
  try {
    ({ reference } = await reserveHold(db, token));
  } catch (error) {
    if (error instanceof BookingError && error.code === "pay_now_required") {
      return goToPayment(token);
    }
    if (error instanceof BookingError) redirect(EXPIRED);
    throw error;
  }
  // A payment begun before ("Zapłać teraz", then back) cannot be paid any
  // more: the reservation is paid from its own link. Expired only now, once
  // the database no longer counts it, so Stripe's event frees nothing.
  if (pending) await expireSession(pending);
  const link = await claimReservationEmail(reference).catch((error) => {
    console.error(`[booking] reserved e-mail ${reference}:`, error);
    return null;
  });
  await clearHoldToken();
  redirect(`/wizyta/${link ?? token}?zmiana=zarezerwowana` as Route);
}

/**
 * A visit its discount code made free: confirmed without a payment, the
 * confirmation e-mailed as after a paid one.
 */
async function confirmFree(token: string, reference: string): Promise<never> {
  try {
    await confirmFreeBooking(createSecretClient(), token);
  } catch (error) {
    if (discountRefusal(error) === "hold_expired") redirect(EXPIRED);
    throw error;
  }
  after(() => sendVisitConfirmation(reference));
  redirect("/umow-wizyte/potwierdzenie?bezplatna=1" as Route);
}

export type DiscountFormState =
  | { status: "idle" }
  | { status: "applied" }
  | { status: "refused"; message: string; code: string };

/** "Zastosuj": a discount code on the held visit (useActionState). */
export async function applyDiscountAction(
  _previous: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  const token = await readHoldToken();
  if (!token) redirect(EXPIRED);
  const code = String(formData.get("kod") ?? "").trim();
  if (!code) return { status: "refused", message: "Wpisz kod rabatowy.", code };
  const db = createSecretClient();
  const pending = await pendingCheckoutSession(db, token).catch(() => null);
  try {
    await applyDiscountCode(db, token, code);
  } catch (error) {
    const hint = discountRefusal(error);
    if (hint === "hold_expired") redirect(EXPIRED);
    if (!hint) console.error("[booking] applying a code failed:", error);
    return { status: "refused", message: discountProblem(hint), code };
  }
  // The payment begun at the old price closes in Stripe too.
  if (pending) await expireSession(pending).catch(() => {});
  revalidatePath(DETAILS_PATH);
  return { status: "applied" };
}

/** "Usuń kod": the list price again. */
export async function removeDiscountAction() {
  const token = await readHoldToken();
  if (!token) redirect(EXPIRED);
  const db = createSecretClient();
  const pending = await pendingCheckoutSession(db, token).catch(() => null);
  try {
    await removeDiscountCode(db, token);
  } catch (error) {
    if (discountRefusal(error) === "hold_expired") redirect(EXPIRED);
    throw error;
  }
  if (pending) await expireSession(pending).catch(() => {});
  revalidatePath(DETAILS_PATH);
}
