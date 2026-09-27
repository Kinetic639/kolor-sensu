import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getRoomByIdAdmin,
  getRoomPublicProfileAdmin,
  listLocations,
  listRoomImages,
  listRoomsAdmin,
} from "@repo/supabase";

export async function loadAdminRooms() {
  const client = await createClient();
  return listRoomsAdmin(client);
}

export async function loadAdminRoomDetail(roomId: string) {
  const client = await createClient();
  const [room, locations, publicProfile, images] = await Promise.all([
    getRoomByIdAdmin(client, roomId),
    listLocations(client),
    getRoomPublicProfileAdmin(client, roomId),
    listRoomImages(client, roomId),
  ]);
  if (!room) return null;
  return {
    room,
    locationName:
      locations.find((location) => location.id === room.locationId)?.name ??
      "Nieznana lokalizacja",
    publicProfile,
    images,
  };
}

export type AdminRoomDetailModel = NonNullable<
  Awaited<ReturnType<typeof loadAdminRoomDetail>>
>;
