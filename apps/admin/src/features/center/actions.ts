"use server";

import { requirePortalRole } from "@/lib/auth";
import {
  companyDetailsSchema,
  type CompanyDetailsInput,
} from "@repo/contracts/company";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import { createClient } from "@/lib/supabase/server";
import {
  createLocation,
  updateCenterPublicProfile,
  updateCenterSettings,
  updateLocation,
} from "@repo/supabase";
import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cached";
import {
  bookingSettingsFormSchema,
  centerProfileFormSchema,
  locationFormSchema,
  retentionFormSchema,
  toRetentionUpdate,
  type RetentionFormValues,
  toBookingSettingsUpdate,
  toCenterProfileUpdate,
  toLocationInput,
  type BookingSettingsFormValues,
  type CenterProfileFormValues,
  type LocationFormValues,
} from "./forms";

type ActionResult = { ok: true } | { ok: false; message: string };

function safeMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "23505")
      return "Lokalizacja z takim adresem już istnieje.";
    if (error.code === "42501") return "Brak uprawnień do tej zmiany.";
  }
  return fallback;
}

// The centre's details appear in the site's header, footer, contact page and
// structured data, so every change refreshes the whole layout.
async function refresh() {
  revalidatePath("/ustawienia");
  updateTag(CACHE_TAGS.centre);
  await revalidateWeb([{ path: "/", type: "layout" }]);
}

export async function updateCenterProfileAction(
  values: CenterProfileFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = centerProfileFormSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, message: "Sprawdź dane formularza." };
  try {
    await updateCenterPublicProfile(
      await createClient(),
      toCenterProfileUpdate(parsed.data),
    );
    await refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: safeMessage(error, "Nie udało się zapisać profilu centrum."),
    };
  }
}

/** The company: the site's footer shows it (so the layout is refreshed). */
export async function updateCompanyAction(
  values: CompanyDetailsInput,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = companyDetailsSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź dane firmy." };
  try {
    await updateCenterSettings(await createClient(), parsed.data);
    await refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: safeMessage(error, "Nie udało się zapisać danych firmy."),
    };
  }
}

export async function saveLocationAction(
  id: string | null,
  values: LocationFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = locationFormSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, message: "Sprawdź dane lokalizacji." };
  try {
    const client = await createClient();
    const input = toLocationInput(parsed.data);
    if (id) await updateLocation(client, id, input);
    else
      await createLocation(client, {
        ...input,
        countryCode: "PL",
        sortOrder: 0,
      });
    await refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: safeMessage(error, "Nie udało się zapisać lokalizacji."),
    };
  }
}

/**
 * Online booking settings. The booking pages read them on every request,
 * so a change applies at once to new bookings (booked visits keep theirs).
 */
export async function updateBookingSettingsAction(
  values: BookingSettingsFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = bookingSettingsFormSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, message: "Sprawdź ustawienia rezerwacji." };
  try {
    await updateCenterSettings(
      await createClient(),
      toBookingSettingsUpdate(parsed.data),
    );
    revalidatePath("/ustawienia");
    updateTag(CACHE_TAGS.centre);
    await revalidateWeb([{ path: "/umow-wizyte", type: "page" }]);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: safeMessage(error, "Nie udało się zapisać ustawień rezerwacji."),
    };
  }
}

/** How long clients' details and the questionnaire's answers are kept. */
export async function updateRetentionAction(
  values: RetentionFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = retentionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Wybierz okresy." };
  try {
    await updateCenterSettings(
      await createClient(),
      toRetentionUpdate(parsed.data),
    );
    revalidatePath("/ustawienia");
    updateTag(CACHE_TAGS.centre);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: safeMessage(error, "Nie udało się zapisać okresów."),
    };
  }
}
