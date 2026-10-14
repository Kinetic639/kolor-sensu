import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getFirstStepsAdmin,
  getHomeContentAdmin,
  getHomeHeadersAdmin,
  listServicesAdmin,
  getHomeSectionsAdmin,
  listSpecialistSummariesForAdmin,
  getRoomsPageContentAdmin,
  getSupportAreasAdmin,
  supportAreaImageUrl,
} from "@repo/supabase";
import {
  mapFirstStepsViewModel,
  mapHomeContentViewModel,
  mapHomeHeadersViewModel,
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

export async function loadHomeHeaders() {
  const client = await createClient();
  const [headers, services] = await Promise.all([
    getHomeHeadersAdmin(client),
    listServicesAdmin(client),
  ]);
  return mapHomeHeadersViewModel(headers, services);
}

export async function loadFirstSteps() {
  return mapFirstStepsViewModel(await getFirstStepsAdmin(await createClient()));
}
