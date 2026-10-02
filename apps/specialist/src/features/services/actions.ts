"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import type { SpecialistServiceUpsert } from "@repo/contracts";
import { upsertMySpecialistService } from "@repo/supabase";
import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cached";

type ActionResult = { ok: true } | { ok: false; message: string };

function safeMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    error.name === "ZodError"
  )
    return "Sprawdź poprawność danych usługi.";
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "42501") return "Brak uprawnień do zmiany tej usługi.";
  }
  return "Nie udało się zapisać usługi. Spróbuj ponownie.";
}

/** Adds a catalogue service to the specialist's offer or updates it. */
export async function saveMyServiceAction(
  input: SpecialistServiceUpsert,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await upsertMySpecialistService(await createClient(), input);
    revalidatePath("/uslugi");
    updateTag(CACHE_TAGS.services);
    revalidatePath("/");
    // Offers feed the price list, the offer pages and the specialist pages.
    await revalidateWeb([{ path: "/", type: "layout" }]);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: safeMessage(error) };
  }
}
