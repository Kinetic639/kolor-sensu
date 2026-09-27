"use server";

import { requirePortalRole } from "@/lib/auth";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import { createClient } from "@/lib/supabase/server";
import {
  createLocation,
  updateCenterPublicProfile,
  updateLocation,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import {
  centerProfileFormSchema,
  locationFormSchema,
  toCenterProfileUpdate,
  toLocationInput,
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
