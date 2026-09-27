"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  getRoomPublicProfileAdmin,
  removeRoomImage,
  reorderRoomImages,
  setRoomMainImage,
  updateRoom,
  upsertRoomPublicProfile,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import {
  roomDetailsFormSchema,
  roomProfileFormSchema,
  toRoomProfileInput,
  toRoomUpdate,
  type RoomDetailsFormValues,
  type RoomProfileFormValues,
} from "./forms";

type ActionResult = { ok: true } | { ok: false; message: string };

function failure(error: unknown, fallback: string): ActionResult {
  console.error("[rooms]", error);
  const code =
    typeof error === "object" && error && "code" in error ? error.code : null;
  if (code === "42501") return { ok: false, message: "Brak uprawnień." };
  if (code === "23514")
    return { ok: false, message: "Gabinet może mieć najwyżej 5 zdjęć." };
  return { ok: false, message: fallback };
}

// The admin list and detail, and the site's rooms page.
async function refresh(roomId: string) {
  revalidatePath("/gabinety");
  revalidatePath(`/gabinety/${roomId}`);
  await revalidateWeb([{ path: "/gabinety" }]);
}

export async function saveRoomDetailsAction(
  roomId: string,
  values: RoomDetailsFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = roomDetailsFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź dane gabinetu." };
  try {
    await updateRoom(await createClient(), roomId, toRoomUpdate(parsed.data));
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać danych gabinetu.");
  }
}

export async function saveRoomProfileAction(
  roomId: string,
  values: RoomProfileFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = roomProfileFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź dane profilu." };
  try {
    const client = await createClient();
    const current = await getRoomPublicProfileAdmin(client, roomId);
    await upsertRoomPublicProfile(
      client,
      roomId,
      toRoomProfileInput(parsed.data, current),
    );
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać profilu gabinetu.");
  }
}

/** Photos are uploaded from the browser; this refreshes the pages after. */
export async function roomImagesChangedAction(roomId: string) {
  await requirePortalRole();
  await refresh(roomId);
}

export async function reorderRoomImagesAction(
  roomId: string,
  imageIds: string[],
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await reorderRoomImages(await createClient(), roomId, imageIds);
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać kolejności zdjęć.");
  }
}

export async function setRoomMainImageAction(
  roomId: string,
  imageId: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await setRoomMainImage(await createClient(), imageId);
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się ustawić zdjęcia głównego.");
  }
}

export async function removeRoomImageAction(
  roomId: string,
  imageId: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await removeRoomImage(await createClient(), imageId);
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się usunąć zdjęcia.");
  }
}
