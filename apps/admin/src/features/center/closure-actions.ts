"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import { closureInputSchema, missingHolidays } from "@repo/contracts/closures";
import {
  addClosures,
  deleteClosure,
  listClosures,
  saveClosure,
  visitsOnDays,
} from "@repo/supabase/closures";
import { revalidatePath } from "next/cache";

// Ustawienia → Dni zamknięcia. A closed day takes its free times off the
// booking pages at once (they ask on every request; the page is refreshed
// for good measure), and the admin's schedules show it.

type ActionResult = { ok: true } | { ok: false; message: string };

async function refresh() {
  revalidatePath("/ustawienia");
  revalidatePath("/kalendarz");
  await revalidateWeb([{ path: "/umow-wizyte", type: "page" }]);
}

export async function saveClosureAction(
  id: string | null,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = closureInputSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź dni i powód." };
  try {
    await saveClosure(await createClient(), id, parsed.data);
    await refresh();
    return { ok: true };
  } catch (error) {
    console.error("[closures] save failed:", error);
    return { ok: false, message: "Nie udało się zapisać dni zamknięcia." };
  }
}

export async function deleteClosureAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await deleteClosure(await createClient(), id);
    await refresh();
    return { ok: true };
  } catch (error) {
    console.error("[closures] delete failed:", error);
    return { ok: false, message: "Nie udało się usunąć dni zamknięcia." };
  }
}

/** The year's public holidays from today on, those not closed yet. */
export async function addHolidaysAction(
  year: number,
  today: string,
): Promise<ActionResult & { added?: number }> {
  await requirePortalRole();
  try {
    const client = await createClient();
    const missing = missingHolidays(year, await listClosures(client), today);
    if (missing.length) {
      await addClosures(
        client,
        missing.map((holiday) => ({
          startsOn: holiday.date,
          endsOn: holiday.date,
          reason: holiday.name,
        })),
      );
      await refresh();
    }
    return { ok: true, added: missing.length };
  } catch (error) {
    console.error("[closures] holidays failed:", error);
    return { ok: false, message: "Nie udało się dodać świąt." };
  }
}

/** How many visits are booked on the days (the form's warning). */
export async function visitsOnDaysAction(from: string, to: string) {
  await requirePortalRole();
  const days = closureInputSchema.safeParse({
    startsOn: from,
    endsOn: to,
    reason: "-",
  });
  if (!days.success) return 0;
  return visitsOnDays(await createClient(), from, to);
}
