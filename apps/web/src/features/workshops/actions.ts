"use server";

import {
  applyWorkshopDiscount,
  cancelWorkshopRegistration,
  confirmFreeWorkshopSeat,
  getWorkshopRegistration,
  holdWorkshopSeat,
  joinWorkshopWaitlist,
  pendingWorkshopCheckout,
  removeWorkshopDiscount,
  reserveWorkshopSeat,
  saveWorkshopDetails,
  WorkshopError,
} from "@repo/supabase/workshops";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { DetailsFormState } from "@/features/booking/actions";
import {
  INTENT_FIELD,
  PAY_LATER,
  readDetailsForm,
} from "@/features/booking/details-form-data";
import { discountProblem } from "@/features/booking/discount";
import {
  GUESS_REFUSALS,
  noteDiscountRefusal,
} from "@repo/supabase/discount-codes";
import {
  clientIp,
  turnstileKeys,
  verifyTurnstile,
  visitorKey,
} from "@/features/booking/guards";
import { expireSession } from "@/features/booking/payment-server";
import { createSecretClient } from "@/lib/supabase/secret";
import { claimWorkshopEmailLink, sendWorkshopEmail } from "./email/send";
import { workshopCheckout } from "./payment-server";
import { clearSeatToken, readSeatToken, saveSeatToken } from "./seat-cookie";
import {
  seatDetailsPath,
  seatNoticeHref,
  seatPaymentPath,
  type SeatNotice,
} from "./signup-paths";
import { workshopHref } from "./workshop-view";

// Signing up for a workshop (docs/product/workshops-plan.md, PR 4): hold a
// seat (after the bot check), the participant's details, then pay now, pay
// later (until seven days before) or, when free, confirm; the waitlist when
// it is full; a code on the seat. The price, the seats and the dates are
// the database's; a form carries only the workshop's address, the details
// and the code.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugOf(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  if (!SLUG.test(slug)) redirect("/warsztaty" as Route);
  return slug;
}

const REFUSAL_NOTICES: Partial<Record<string, SeatNotice>> = {
  full: "brak-miejsc",
  registration_closed: "zamkniete",
  not_found: "zamkniete",
  too_many_holds: "za-duzo-prob",
  hold_expired: "wygaslo",
};

function refused(slug: string, error: unknown): never {
  const notice =
    error instanceof WorkshopError ? REFUSAL_NOTICES[error.code] : undefined;
  if (notice) redirect(seatNoticeHref(slug, notice));
  throw error;
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

/** A seat still only held gives its place back (nothing else does). */
async function releaseHeld(token: string) {
  const db = createSecretClient();
  const registration = await getWorkshopRegistration(db, token).catch(
    () => null,
  );
  if (registration?.status !== "held") return;
  const pending = await pendingWorkshopCheckout(db, token).catch(() => null);
  if (pending) await expireSession(pending);
  await cancelWorkshopRegistration(db, token).catch(() => undefined);
}

/** "Zapisz się": the bot check, then a seat held for the visitor. */
export async function holdSeatAction(formData: FormData) {
  const slug = slugOf(formData);
  const ip = clientIp(await headers());
  const human = await verifyTurnstile(
    String(formData.get("cf-turnstile-response") ?? ""),
    ip,
    turnstileKeys().secretKey,
  );
  if (!human) redirect(seatNoticeHref(slug, "weryfikacja"));

  // One visitor, one held seat: signing up again gives the earlier one back.
  const previous = await readSeatToken();
  if (previous) await releaseHeld(previous);

  try {
    const held = await holdWorkshopSeat(
      createSecretClient(),
      slug,
      visitorKey(ip, process.env.SUPABASE_SECRET_KEY ?? ""),
    );
    await saveSeatToken(held.accessToken);
  } catch (error) {
    refused(slug, error);
  }
  redirect(seatDetailsPath(slug));
}

/** "Zmień zdanie": the held seat back, to the workshop's page. */
export async function releaseSeatAction(formData: FormData) {
  const slug = slugOf(formData);
  const token = await readSeatToken();
  if (token) {
    await releaseHeld(token);
    await clearSeatToken();
  }
  redirect(workshopHref(slug));
}

const ALREADY_REGISTERED =
  "Ten adres e-mail jest już zapisany na ten warsztat (albo na jego listę rezerwową). Sprawdź skrzynkę: link do zapisu jest w naszym e-mailu.";

function invalid(
  form: Extract<ReturnType<typeof readDetailsForm>, { ok: true }>,
  message: string,
): DetailsFormState {
  return {
    status: "invalid",
    errors: {},
    values: {
      ...form.details,
      notes: form.details.notes ?? "",
      acceptTerms: true,
      acceptPrivacy: true,
    },
    message,
  };
}

/** The participant's details on the held seat, then the next step. */
export async function saveSeatDetailsAction(
  _previous: DetailsFormState,
  formData: FormData,
): Promise<DetailsFormState> {
  const slug = slugOf(formData);
  const token = await readSeatToken();
  if (!token) redirect(seatNoticeHref(slug, "wygaslo"));

  const form = readDetailsForm(formData);
  if (!form.ok && "bot" in form) return { status: "idle" };
  if (!form.ok) return { status: "invalid", ...form };

  const db = createSecretClient();
  try {
    await saveWorkshopDetails(db, token, form.details);
  } catch (error) {
    if (error instanceof WorkshopError) {
      if (error.code === "hold_expired") refused(slug, error);
      if (error.code === "already_registered")
        return invalid(form, ALREADY_REGISTERED);
      return invalid(form, "Sprawdź, proszę, swoje dane i spróbuj ponownie.");
    }
    throw error;
  }

  const registration = await getWorkshopRegistration(db, token);
  if (!registration) redirect(seatNoticeHref(slug, "wygaslo"));
  if (registration.priceMinor === 0)
    return confirmFree(slug, token, registration.reference);
  if (formData.get(INTENT_FIELD) === PAY_LATER)
    return reserveLater(slug, token);
  return goToPayment(slug, token);
}

/** A free seat (free, or a code covering it): confirmed, nothing to pay. */
async function confirmFree(
  slug: string,
  token: string,
  reference: string,
): Promise<never> {
  try {
    await confirmFreeWorkshopSeat(createSecretClient(), token);
  } catch (error) {
    refused(slug, error);
  }
  after(() => sendWorkshopEmail(reference, "confirmation"));
  redirect("/warsztaty/potwierdzenie?bezplatna=1" as Route);
}

/** "Zapłacę później": the seat waits for the money until seven days before. */
async function reserveLater(slug: string, token: string): Promise<never> {
  let reference: string;
  try {
    ({ reference } = await reserveWorkshopSeat(createSecretClient(), token));
  } catch (error) {
    if (error instanceof WorkshopError && error.code === "pay_now_required")
      return goToPayment(slug, token);
    refused(slug, error);
  }
  const link = await claimWorkshopEmailLink(reference, "reserved");
  await clearSeatToken();
  redirect(`/warsztaty/zapis/${link ?? token}?zarezerwowano=1` as Route);
}

async function goToPayment(slug: string, token: string): Promise<never> {
  try {
    const session = await workshopCheckout(
      token,
      `${await siteOrigin()}/warsztaty/potwierdzenie`,
    );
    if (!session) {
      const registration = await getWorkshopRegistration(
        createSecretClient(),
        token,
      );
      return confirmFree(slug, token, registration?.reference ?? "");
    }
  } catch (error) {
    if (error instanceof WorkshopError && error.code === "details_required")
      redirect(seatDetailsPath(slug));
    refused(slug, error);
  }
  redirect(seatPaymentPath(slug));
}

export type SeatCodeState =
  | { status: "idle" }
  | { status: "applied" }
  | { status: "refused"; message: string; code: string };

/** "Zastosuj": a discount code on the held seat (useActionState). */
export async function applySeatCodeAction(
  _previous: SeatCodeState,
  formData: FormData,
): Promise<SeatCodeState> {
  const slug = slugOf(formData);
  const token = await readSeatToken();
  if (!token) redirect(seatNoticeHref(slug, "wygaslo"));
  const code = String(formData.get("kod") ?? "").trim();
  if (!code) return { status: "refused", message: "Wpisz kod rabatowy.", code };
  const db = createSecretClient();
  const pending = await pendingWorkshopCheckout(db, token).catch(() => null);
  try {
    await applyWorkshopDiscount(db, token, code);
  } catch (error) {
    if (error instanceof WorkshopError && error.code === "hold_expired")
      refused(slug, error);
    const hint = error instanceof WorkshopError ? error.code : null;
    if (!hint || hint === "unknown")
      console.error("[workshops] applying a code failed:", error);
    // A wrong guess counts against the hold (10 an hour).
    if (hint && GUESS_REFUSALS.has(hint))
      await noteDiscountRefusal(db, token).catch(() => undefined);
    return { status: "refused", message: discountProblem(hint), code };
  }
  // The payment begun at the old price closes in Stripe too.
  if (pending) await expireSession(pending).catch(() => {});
  revalidatePath(seatDetailsPath(slug));
  return { status: "applied" };
}

/** "Usuń kod": the workshop's price again. */
export async function removeSeatCodeAction(formData: FormData) {
  const slug = slugOf(formData);
  const token = await readSeatToken();
  if (!token) redirect(seatNoticeHref(slug, "wygaslo"));
  const db = createSecretClient();
  const pending = await pendingWorkshopCheckout(db, token).catch(() => null);
  try {
    await removeWorkshopDiscount(db, token);
  } catch (error) {
    refused(slug, error);
  }
  if (pending) await expireSession(pending).catch(() => {});
  revalidatePath(seatDetailsPath(slug));
}

/** The waitlist of a full workshop: the details, then its e-mail. */
export async function joinWaitlistAction(
  _previous: DetailsFormState,
  formData: FormData,
): Promise<DetailsFormState> {
  const slug = slugOf(formData);
  const form = readDetailsForm(formData);
  if (!form.ok && "bot" in form) return { status: "idle" };
  if (!form.ok) return { status: "invalid", ...form };

  const ip = clientIp(await headers());
  let joined: { reference: string; accessToken: string };
  try {
    joined = await joinWorkshopWaitlist(
      createSecretClient(),
      slug,
      visitorKey(ip, process.env.SUPABASE_SECRET_KEY ?? ""),
      form.details,
    );
  } catch (error) {
    if (error instanceof WorkshopError) {
      if (error.code === "already_registered")
        return invalid(form, ALREADY_REGISTERED);
      if (error.code === "seats_free")
        return invalid(
          form,
          "Właśnie zwolniło się miejsce: odśwież stronę i zapisz się zwyczajnie.",
        );
      if (error.code === "too_many_holds")
        return invalid(
          form,
          "Za dużo prób naraz. Spróbuj ponownie za kilkanaście minut.",
        );
      if (error.code === "registration_closed" || error.code === "not_found")
        return invalid(form, "Zapisy na ten warsztat są już zamknięte.");
      return invalid(form, "Sprawdź, proszę, swoje dane i spróbuj ponownie.");
    }
    throw error;
  }
  const link = await claimWorkshopEmailLink(joined.reference, "waitlisted");
  redirect(`/warsztaty/zapis/${link ?? joined.accessToken}?lista=1` as Route);
}

/** "Zapłać" on a reserved seat's page (its e-mailed link). */
export async function payReservedSeatAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) redirect("/warsztaty" as Route);
  const page = `/warsztaty/zapis/${token}`;
  try {
    const session = await workshopCheckout(
      token,
      `${await siteOrigin()}/warsztaty/potwierdzenie`,
    );
    if (!session) redirect(page as Route);
  } catch (error) {
    if (error instanceof WorkshopError)
      redirect(`${page}?platnosc=niedostepna` as Route);
    throw error;
  }
  redirect(`${page}/platnosc` as Route);
}
