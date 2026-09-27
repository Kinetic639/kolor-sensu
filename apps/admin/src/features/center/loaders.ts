import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCenterPublicProfile, listLocations } from "@repo/supabase";

export async function loadCenterSettings() {
  const client = await createClient();
  const [profile, locations] = await Promise.all([
    getCenterPublicProfile(client),
    listLocations(client),
  ]);
  return { profile, locations };
}
