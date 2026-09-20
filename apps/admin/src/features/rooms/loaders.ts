import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getRoomByIdAdmin,
  getRoomOpeningHours,
  getRoomPublicProfileAdmin,
  listLocations,
  listRoomAvailabilityExceptions,
  listRoomsAdmin,
} from "@repo/supabase";

export async function loadAdminRoomsPage() {
  const client = await createClient();
  const [rooms, locations] = await Promise.all([
    listRoomsAdmin(client),
    listLocations(client),
  ]);
  return { rooms, locations };
}

export async function loadAdminRoomDetail(id: string) {
  const client = await createClient();
  const room = await getRoomByIdAdmin(client, id);
  if (!room) return null;
  const [locations, publicProfile, openingHours, availabilityExceptions] =
    await Promise.all([
      listLocations(client),
      getRoomPublicProfileAdmin(client, id),
      getRoomOpeningHours(client, id),
      listRoomAvailabilityExceptions(client, id),
    ]);
  return {
    room,
    locations,
    publicProfile,
    openingHours,
    availabilityExceptions,
  };
}
