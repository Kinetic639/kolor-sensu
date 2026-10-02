"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  addRoomException,
  createRoom,
  deleteRoomException,
  getRoomPublicProfileAdmin,
  removeRoomImage,
  reorderRoomImages,
  replaceRoomOpeningHours,
  setRoomMainImage,
  updateRoom,
  upsertRoomPublicProfile,
} from "@repo/supabase";
import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cached";
import {
  exceptionFormSchema,
  toRoomExceptionInput,
  type ExceptionFormValues,
} from "./exception-form";
import {
  newRoomFormSchema,
  roomProfileForVisibility,
  roomDetailsFormSchema,
  roomProfileFormSchema,
  toRoomProfileInput,
  toRoomCreate,
  toRoomUpdate,
  type NewRoomFormValues,
  type RoomDetailsFormValues,
  type RoomProfileFormValues,
} from "./forms";
import {
  openingHoursFormSchema,
  toOpeningHoursIntervals,
  type OpeningHoursFormValues,
} from "./opening-hours-form";

type ActionResult = { ok: true } | { ok: false; message: string };

function failure(
  error: unknown,
  fallback: string,
): { ok: false; message: string } {
  console.error("[rooms]", error);
  const code =
    typeof error === "object" && error && "code" in error ? error.code : null;
  if (code === "42501") return { ok: false, message: "Brak uprawnień." };
  if (code === "23505")
    return {
      ok: false,
      message: "W tej lokalizacji jest już gabinet o takiej nazwie.",
    };
  if (code === "23P01")
    return { ok: false, message: "Te godziny nakładają się na już zapisane." };
  if (code === "23514")
    return { ok: false, message: "Gabinet może mieć najwyżej 5 zdjęć." };
  return { ok: false, message: fallback };
}

// The admin list and detail, and the site's rooms page.
async function refresh(roomId: string) {
  revalidatePath("/gabinety");
  updateTag(CACHE_TAGS.rooms);
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
    const client = await createClient();
    const room = await updateRoom(client, roomId, toRoomUpdate(parsed.data));
    // On the site takes the room public and its profile published (or
    // neither); a room shown for the first time gets a profile from its name.
    const profile = roomProfileForVisibility(
      await getRoomPublicProfileAdmin(client, roomId),
      room.name,
      parsed.data.onSite,
    );
    if (profile) await upsertRoomPublicProfile(client, roomId, profile);
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
    // Whether it is on the site stays as set in the room's settings.
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

export async function createRoomAction(
  values: NewRoomFormValues,
): Promise<{ ok: true; roomId: string } | { ok: false; message: string }> {
  await requirePortalRole();
  const parsed = newRoomFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź dane gabinetu." };
  try {
    const room = await createRoom(
      await createClient(),
      toRoomCreate(parsed.data),
    );
    revalidatePath("/gabinety");
    updateTag(CACHE_TAGS.rooms);
    return { ok: true, roomId: room.id };
  } catch (error) {
    return failure(error, "Nie udało się dodać gabinetu.");
  }
}

/**
 * Saves the room's week at once. Specialists' windows saved before stay;
 * the schedule marks those now outside the hours.
 */
export async function saveOpeningHoursAction(
  roomId: string,
  values: OpeningHoursFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = openingHoursFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź godziny." };
  try {
    await replaceRoomOpeningHours(
      await createClient(),
      roomId,
      toOpeningHoursIntervals(parsed.data),
    );
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać godzin otwarcia.");
  }
}

export async function addRoomExceptionAction(
  roomId: string,
  values: ExceptionFormValues,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = exceptionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Sprawdź dane wyjątku." };
  try {
    await addRoomException(
      await createClient(),
      toRoomExceptionInput(roomId, parsed.data),
    );
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się dodać wyjątku.");
  }
}

export async function deleteRoomExceptionAction(
  roomId: string,
  exceptionId: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await deleteRoomException(await createClient(), exceptionId);
    await refresh(roomId);
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się usunąć wyjątku.");
  }
}
