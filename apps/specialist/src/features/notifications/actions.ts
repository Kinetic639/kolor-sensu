"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationsRead } from "@repo/supabase";

// Opening the bell's inbox reads it (R13); the database marks only this
// person's own notifications.

export async function markNotificationsReadAction() {
  await requirePortalRole();
  return markNotificationsRead(await createClient(), "specialist");
}
