"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  LocationCreate,
  LocationUpdate,
  RoomAvailabilityExceptionCreate,
  RoomCreate,
  RoomOpeningHoursIntervalInput,
  RoomPublicProfileInput,
  RoomUpdate,
} from "@repo/contracts";
import {
  createLocation,
  createRoom,
  createRoomAvailabilityException,
  removeRoomAvailabilityException,
  replaceRoomOpeningHours,
  updateLocation,
  updateRoom,
  updateRoomAvailabilityException,
  updateRoomPublicProfile,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { loadAdminRoomDetail, loadAdminRoomsPage } from "./loaders";

function safeMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "23505") return "Taki wpis już istnieje.";
    if (error.code === "23P01")
      return "Przedziały godzin nie mogą się nakładać.";
    if (error.code === "23503") return "Wybrana lokalizacja nie istnieje.";
  }
  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    error.name === "ZodError"
  )
    return "Sprawdź poprawność danych formularza.";
  return "Nie udało się zapisać zmian. Spróbuj ponownie.";
}

const success = { ok: true as const };
const failure = (error: unknown) => ({
  ok: false as const,
  message: safeMessage(error),
});

function revalidateRoom(id?: string) {
  revalidatePath("/gabinety");
  if (id) revalidatePath(`/gabinety/${id}`);
}

export async function getAdminRoomsPageAction() {
  await requirePortalRole();
  return loadAdminRoomsPage();
}

export async function getAdminRoomDetailAction(id: string) {
  await requirePortalRole();
  return loadAdminRoomDetail(id);
}

export async function createLocationAction(input: LocationCreate) {
  await requirePortalRole();
  try {
    await createLocation(await createClient(), input);
    revalidateRoom();
    return success;
  } catch (error) {
    return failure(error);
  }
}

export async function updateLocationAction(id: string, input: LocationUpdate) {
  await requirePortalRole();
  try {
    await updateLocation(await createClient(), id, input);
    revalidateRoom();
    return success;
  } catch (error) {
    return failure(error);
  }
}

export async function createRoomAction(input: RoomCreate) {
  await requirePortalRole();
  try {
    const room = await createRoom(await createClient(), input);
    revalidateRoom(room.id);
    return { ok: true as const, roomId: room.id };
  } catch (error) {
    return failure(error);
  }
}

export async function updateRoomAction(id: string, input: RoomUpdate) {
  await requirePortalRole();
  try {
    await updateRoom(await createClient(), id, input);
    revalidateRoom(id);
    return success;
  } catch (error) {
    return failure(error);
  }
}

export async function updateRoomPublicProfileAction(
  id: string,
  input: RoomPublicProfileInput,
) {
  await requirePortalRole();
  try {
    await updateRoomPublicProfile(await createClient(), id, input);
    revalidateRoom(id);
    return success;
  } catch (error) {
    return failure(error);
  }
}

export async function replaceRoomOpeningHoursAction(
  id: string,
  intervals: RoomOpeningHoursIntervalInput[],
) {
  await requirePortalRole();
  try {
    await replaceRoomOpeningHours(await createClient(), id, intervals);
    revalidateRoom(id);
    return success;
  } catch (error) {
    return failure(error);
  }
}

export async function createRoomAvailabilityExceptionAction(
  input: RoomAvailabilityExceptionCreate,
) {
  await requirePortalRole();
  try {
    await createRoomAvailabilityException(await createClient(), input);
    revalidateRoom(input.roomId);
    return success;
  } catch (error) {
    return failure(error);
  }
}

export async function updateRoomAvailabilityExceptionAction(
  id: string,
  input: RoomAvailabilityExceptionCreate,
) {
  await requirePortalRole();
  try {
    await updateRoomAvailabilityException(await createClient(), id, input);
    revalidateRoom(input.roomId);
    return success;
  } catch (error) {
    return failure(error);
  }
}

export async function removeRoomAvailabilityExceptionAction(
  id: string,
  roomId: string,
) {
  await requirePortalRole();
  try {
    await removeRoomAvailabilityException(await createClient(), id);
    revalidateRoom(roomId);
    return success;
  } catch (error) {
    return failure(error);
  }
}
