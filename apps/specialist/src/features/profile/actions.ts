"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { specialistProfileSubmissionSchema } from "@repo/contracts";
import {
  saveMySpecialistProfileDraft,
  submitProfileForReview,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import type { ProfileFormValues } from "./types";

type ActionResult = { ok: true } | { ok: false; message: string };

function safeMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "55000")
      return "Profil czeka na akceptację i nie można go teraz zmienić.";
    if (error.code === "42501") return "Brak uprawnień do edycji profilu.";
  }
  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    error.name === "ZodError"
  )
    return "Sprawdź poprawność danych formularza.";
  return "Nie udało się zapisać profilu. Spróbuj ponownie.";
}

function refresh() {
  revalidatePath("/profil");
  revalidatePath("/");
}

export async function saveProfileDraftAction(
  values: ProfileFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await saveMySpecialistProfileDraft(await createClient(), values);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: safeMessage(error) };
  }
}

/** Saves the form as the draft, then sends that draft for review. */
export async function submitProfileAction(
  values: ProfileFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = specialistProfileSubmissionSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Uzupełnij wymagane pola profilu." };
  }
  try {
    const client = await createClient();
    const draftId = await saveMySpecialistProfileDraft(client, parsed.data);
    await submitProfileForReview(client, draftId);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: safeMessage(error) };
  }
}
