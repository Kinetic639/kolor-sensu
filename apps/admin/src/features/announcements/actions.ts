"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import { deleteAnnouncement, saveAnnouncement } from "@repo/supabase";
import { revalidatePath } from "next/cache";

// The announcements (the admin's CMS): saved or removed, then the list and
// every page of the site (the bar is above every header) render again.

type Result = { ok: true } | { ok: false; message: string };

async function refresh() {
  revalidatePath("/ogloszenia");
  await revalidateWeb([{ path: "/", type: "layout" }]);
}

export async function saveAnnouncementAction(
  id: string | null,
  values: Record<string, unknown>,
): Promise<Result> {
  await requirePortalRole();
  try {
    await saveAnnouncement(await createClient(), id, values);
  } catch (error) {
    console.error("[announcements] not saved:", error);
    return { ok: false, message: "Nie udało się zapisać ogłoszenia." };
  }
  await refresh();
  return { ok: true };
}

export async function deleteAnnouncementAction(id: string): Promise<Result> {
  await requirePortalRole();
  try {
    await deleteAnnouncement(await createClient(), id);
  } catch (error) {
    console.error("[announcements] not removed:", error);
    return { ok: false, message: "Nie udało się usunąć ogłoszenia." };
  }
  await refresh();
  return { ok: true };
}
