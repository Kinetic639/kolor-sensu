"use server";

import { setWorkshopAttendance } from "@repo/supabase/workshops-admin";
import { revalidatePath } from "next/cache";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// A leader marks who came (docs/product/workshops-plan.md, PR 6); the
// database checks they lead the workshop and that it has begun.

export async function setAttendanceAction(
  registrationId: string,
  attended: boolean,
): Promise<{ ok: boolean }> {
  await requirePortalRole();
  try {
    await setWorkshopAttendance(await createClient(), registrationId, attended);
    revalidatePath("/warsztaty");
    return { ok: true };
  } catch (error) {
    console.error("[workshops] attendance:", error);
    return { ok: false };
  }
}
