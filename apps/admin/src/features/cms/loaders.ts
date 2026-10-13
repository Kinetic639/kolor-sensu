import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getFirstStepsAdmin,
  getHomeContentAdmin,
  getHomeSectionsAdmin,
  listSpecialistSummariesForAdmin,
  getRoomsPageContentAdmin,
  getSupportAreasAdmin,
  supportAreaImageUrl,
} from "@repo/supabase";
import {
  mapFirstStepsViewModel,
  mapHomeContentViewModel,
  mapHomeSectionsViewModel,
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

export async function loadHomeSections() {
  const client = await createClient();
  const [sections, specialists] = await Promise.all([
    getHomeSectionsAdmin(client),
    listSpecialistSummariesForAdmin(client),
  ]);
  return mapHomeSectionsViewModel(
    sections,
    (path) => supportAreaImageUrl(client, path),
    specialists,
  );
}

export async function loadFirstSteps() {
  return mapFirstStepsViewModel(await getFirstStepsAdmin(await createClient()));
}
