import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getCenterPublicProfile,
  getCenterSettings,
  listLocations,
} from "@repo/supabase";

export async function loadCenterSettings() {
  const client = await createClient();
  const [profile, locations, settings] = await Promise.all([
    getCenterPublicProfile(client),
    listLocations(client),
    getCenterSettings(client),
  ]);
  return { profile, locations, settings };
}
