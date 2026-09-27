import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getHomeContentAdmin, getRoomsPageContentAdmin } from "@repo/supabase";
import { mapHomeContentViewModel, mapRoomsPageViewModel } from "./view-model";

export async function loadHomeContent() {
  const client = await createClient();
  return mapHomeContentViewModel(await getHomeContentAdmin(client));
}

export async function loadRoomsPageContent() {
  const client = await createClient();
  return mapRoomsPageViewModel(await getRoomsPageContentAdmin(client));
}
