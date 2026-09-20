import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listRoomsAdmin } from "@repo/supabase";

export async function loadAdminRooms() {
  const client = await createClient();
  return listRoomsAdmin(client);
}
