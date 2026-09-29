"use server";

import {
  BookingError,
  holdSlot,
  releaseHold,
  saveBookingDetails,
} from "@repo/supabase";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSecretClient } from "@/lib/supabase/secret";
import {
  readDetailsForm,
  type DetailsFormErrors,
  type DetailsFormValues,
} from "./details-form-data";
import { clientIp, turnstileKeys, verifyTurnstile, visitorKey } from "./guards";
import { clearHoldToken, readHoldToken, saveHoldToken } from "./hold-cookie";
import { loadWizard } from "./load-wizard";
import {
  bookingHref,
  bookingNoticeHref,
  loadBookingParams,
} from "./search-params";

// The booking steps that write. The forms carry only the wizard's choices
// and the client's details; the time's instant, the offer and the price
// are worked out again here and in the database, never taken from a form.

const DETAILS_PATH = "/umow-wizyte/dane" as Route;

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
    await releaseHold(createSecretClient(), token).catch(() => false);
    await clearHoldToken();
  }
  redirect(bookingHref({}));
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
    await saveBookingDetails(createSecretClient(), token, form.details);
  } catch (error) {
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
        },
        message: "Sprawdź, proszę, swoje dane i spróbuj ponownie.",
      };
    }
    throw error;
  }
  return { status: "saved" };
}
