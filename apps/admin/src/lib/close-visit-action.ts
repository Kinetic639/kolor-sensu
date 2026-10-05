"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  closingMessage,
  visitClosingSchema,
  type VisitClosing,
} from "@repo/contracts/visit-closing";
import { closeVisit, ClosingError } from "@repo/supabase/visit-closing";
import { revalidatePath } from "next/cache";

// Closing a visit from its panel: the database checks it is the caller's
// (their own visit, or an admin) and that it has begun.

export async function closeVisitAction(
  visitId: string,
  closing: VisitClosing,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePortalRole();
  const parsed = visitClosingSchema.safeParse(closing);
  if (!parsed.success) return { ok: false, message: closingMessage("invalid") };
  try {
    await closeVisit(await createClient(), visitId, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof ClosingError) {
      return { ok: false, message: closingMessage(error.code) };
    }
    console.error("[visits] closing failed:", error);
    return { ok: false, message: closingMessage(undefined) };
  }
}
