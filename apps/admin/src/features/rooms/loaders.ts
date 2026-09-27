import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getRoomPublicProfileAdmin, listRoomsAdmin } from "@repo/supabase";

export async function loadAdminRooms() {
  const client = await createClient();
  const rooms = await listRoomsAdmin(client);
  const profiles = await Promise.all(
    rooms.map((room) => getRoomPublicProfileAdmin(client, room.id)),
  );
  return rooms.map((room, index) => ({
    ...room,
    publicProfile: profiles[index] ?? null,
  }));
}

export type AdminRoomWithProfile = Awaited<
  ReturnType<typeof loadAdminRooms>
>[number];
