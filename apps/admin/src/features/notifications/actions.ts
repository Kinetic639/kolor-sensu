"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markNotificationsRead } from "@repo/supabase";

// The bell's inbox (R13): a notification read (its button, or opened), or
// all of them; the database marks only this person's own.

export async function markNotificationReadAction(id: number) {
  await requirePortalRole();
  return markNotificationRead(await createClient(), id);
}

export async function markNotificationsReadAction() {
  await requirePortalRole();
  return markNotificationsRead(await createClient(), "admin");
}
