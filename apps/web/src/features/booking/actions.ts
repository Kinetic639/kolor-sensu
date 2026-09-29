"use server";

import { BookingError, holdSlot, releaseHold } from "@repo/supabase";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createSecretClient } from "@/lib/supabase/secret";
import { clearHoldToken, readHoldToken, saveHoldToken } from "./hold-cookie";
import { loadWizard } from "./load-wizard";
import {
  bookingHref,
  bookingNoticeHref,
  loadBookingParams,
} from "./search-params";

// Holding the chosen time: the one step that writes. The form carries only
// the wizard's choices; the time's instant, the offer and the price are all
// worked out again here and in the database, never taken from the form.
// TODO(R5): Turnstile and a per-visitor limit before holding.

export async function holdTimeAction(formData: FormData) {
  const params = loadBookingParams(
    new URLSearchParams(
      [...formData.entries()].flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value] as [string, string]] : [],
      ),
    ),
  );
  const wizard = await loadWizard(params);
  if (!wizard) redirect("/umow-wizyte");
  const chosen =
    wizard.view.panel.kind === "slots" ? wizard.view.panel.chosen : null;
  if (!chosen) redirect(bookingNoticeHref(wizard.params, "termin-zajety"));

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
    });
    await saveHoldToken(held.accessToken);
  } catch (error) {
    if (error instanceof BookingError && error.code !== "unknown") {
      redirect(bookingNoticeHref(wizard.params, "termin-zajety"));
    }
    throw error;
  }
  redirect("/umow-wizyte/dane" as Route);
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
