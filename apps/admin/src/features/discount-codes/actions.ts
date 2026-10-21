"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/use-save";
import {
  DISCOUNT_PROBLEMS,
  discountCodeInputSchema,
  type DiscountCodeInput,
} from "@repo/contracts/discount-codes";
import {
  deleteDiscountCode,
  saveDiscountCode,
} from "@repo/supabase/discount-codes";
import { revalidatePath } from "next/cache";

// Kody rabatowe's saves: the database checks the admin role and the rules
// again; its refusals are said in Polish.

function failure(error: unknown, fallback: string): ActionResult {
  if (typeof error === "object" && error) {
    if ("code" in error && error.code === "42501")
      return { ok: false, message: "Brak uprawnień do tej zmiany." };
    if ("code" in error && error.code === "23505")
      return { ok: false, message: "Taki kod już istnieje." };
    if ("message" in error && typeof error.message === "string") {
      const problem = DISCOUNT_PROBLEMS[error.message];
      if (problem) return { ok: false, message: problem };
    }
  }
  console.error("[discount-codes]", error);
  return { ok: false, message: fallback };
}

export async function saveDiscountCodeAction(
  id: string | null,
  input: DiscountCodeInput,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = discountCodeInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Sprawdź pola.",
    };
  try {
    await saveDiscountCode(await createClient(), id, parsed.data);
    revalidatePath("/kody-rabatowe");
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać kodu.");
  }
}

export async function deleteDiscountCodeAction(
  id: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await deleteDiscountCode(await createClient(), id);
    revalidatePath("/kody-rabatowe");
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się usunąć kodu.");
  }
}
