import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getRoomByIdAdmin,
  getRoomPublicProfileAdmin,
  listLocations,
  listRoomImages,
  listRoomsAdmin,
} from "@repo/supabase";

// Rooms can be placed in any location the centre has, active or not.
function toLocationOptions(
  locations: Awaited<ReturnType<typeof listLocations>>,
) {
  return locations.map((location) => ({
    id: location.id,
    name: location.active ? location.name : `${location.name} (nieaktywna)`,
  }));
}

export async function loadAdminRooms() {
  const client = await createClient();
  const [rooms, locations] = await Promise.all([
    listRoomsAdmin(client),
    listLocations(client),
  ]);
  return { rooms, locations: toLocationOptions(locations) };
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
    locations: toLocationOptions(locations),
  };
}

export type LocationOption = { id: string; name: string };

export type AdminRoomDetailModel = NonNullable<
  Awaited<ReturnType<typeof loadAdminRoomDetail>>
>;
