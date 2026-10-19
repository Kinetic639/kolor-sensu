import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getCrisisHelpAdmin,
  getHomeStoryAdmin,
  getHomeThoughtsAdmin,
  getHomeLocationAdmin,
  getNewsletterBandAdmin,
  getWhyUsAdmin,
  getFirstStepsAdmin,
  getHomeContentAdmin,
  getHomeHeadersAdmin,
  listServicesAdmin,
  getHomeSectionsAdmin,
  listSpecialistSummariesForAdmin,
  getRoomsPageContentAdmin,
  getSupportAreasAdmin,
  listPublishedRoomPlacements,
  listRoomImages,
  supportAreaImageUrl,
  getPageSeoAdmin,
  getSiteAppearanceAdmin,
} from "@repo/supabase";
import type { SeoPage } from "@repo/contracts";
import { mapRoomsPeekModel } from "./rooms-peek";
import { mapSiteAppearanceViewModel } from "./appearance-editor";
import { mapPageSeoViewModel } from "./seo-editor";
import {
  mapContentViewModel,
  mapFirstStepsViewModel,
  mapHomeContentViewModel,
  mapHomeHeadersViewModel,
  mapHomeSectionsViewModel,
  mapHomeStoryViewModel,
  mapRoomsPageViewModel,
  mapSupportAreasViewModel,
} from "./view-model";

export async function loadHomeContent() {
  const client = await createClient();
  return mapHomeContentViewModel(await getHomeContentAdmin(client), (path) =>
    supportAreaImageUrl(client, path),
  );
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

export async function loadWhyUs() {
  return mapContentViewModel(await getWhyUsAdmin(await createClient()));
}

export async function loadNewsletterBand() {
  return mapContentViewModel(
    await getNewsletterBandAdmin(await createClient()),
  );
}

export async function loadHomeLocation() {
  return mapContentViewModel(await getHomeLocationAdmin(await createClient()));
}

export async function loadCrisisHelp() {
  return mapContentViewModel(await getCrisisHelpAdmin(await createClient()));
}

export async function loadHomeThoughts() {
  return mapContentViewModel(await getHomeThoughtsAdmin(await createClient()));
}

export async function loadHomeStory() {
  const client = await createClient();
  return mapHomeStoryViewModel(await getHomeStoryAdmin(client), (path) =>
    supportAreaImageUrl(client, path),
  );
}

/**
 * Home → "Zajrzyj do środka": the photos of the rooms the site shows (the
 * same published rooms and photos the site reads), counted for the CMS.
 */
export async function loadRoomsPeek() {
  const client = await createClient();
  const placements = await listPublishedRoomPlacements(client);
  const images = await Promise.all(
    placements.map((placement) => listRoomImages(client, placement.roomId)),
  );
  return mapRoomsPeekModel(images.map((own) => own.length));
}

export async function loadPageSeo(page: SeoPage) {
  const client = await createClient();
  return mapPageSeoViewModel(await getPageSeoAdmin(client, page), (path) =>
    supportAreaImageUrl(client, path),
  );
}

/** The site's shared settings, with each image's address to preview. */
export async function loadSiteAppearance() {
  const client = await createClient();
  return mapSiteAppearanceViewModel(
    await getSiteAppearanceAdmin(client),
    (path) => supportAreaImageUrl(client, path),
  );
}
