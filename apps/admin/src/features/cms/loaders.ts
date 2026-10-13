import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getHomeContentAdmin,
  getRoomsPageContentAdmin,
  getSupportAreasAdmin,
  supportAreaImageUrl,
} from "@repo/supabase";
import {
  mapHomeContentViewModel,
  mapRoomsPageViewModel,
  mapSupportAreasViewModel,
} from "./view-model";

export async function loadHomeContent() {
  const client = await createClient();
  return mapHomeContentViewModel(await getHomeContentAdmin(client));
}

export async function loadRoomsPageContent() {
  const client = await createClient();
  return mapRoomsPageViewModel(await getRoomsPageContentAdmin(client));
}

export async function loadSupportAreas() {
  const client = await createClient();
  return mapSupportAreasViewModel(await getSupportAreasAdmin(client), (path) =>
    supportAreaImageUrl(client, path),
  );
}
