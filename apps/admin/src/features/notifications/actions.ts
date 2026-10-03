"use server";

import { requirePortalRole } from "@/lib/auth";
import { centreSettings, specialistAvatars } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { visitRows } from "@repo/scheduling";
import {
  markNotificationRead,
  markNotificationsRead,
  markNotificationUnread,
  getVisit,
} from "@repo/supabase";

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

export async function markNotificationUnreadAction(id: number) {
  await requirePortalRole();
  return markNotificationUnread(await createClient(), id);
}

/** An opened notification's booking as it is now (the drawer asks). */
export async function loadNotificationVisitAction(id: string) {
  await requirePortalRole();
  const [visit, settings, avatars] = await Promise.all([
    getVisit(await createClient(), id).catch(() => null),
    centreSettings(),
    specialistAvatars(),
  ]);
  if (!visit) return null;
  const row = visitRows([visit], { timeZone: settings.timezone })[0]!;
  return { row, avatar: avatars[row.specialistId] ?? null };
}
