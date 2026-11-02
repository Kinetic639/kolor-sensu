import "server-only";
import { defaultHomeRoomsGallery } from "@repo/contracts/rooms-peek";
import type { LegalPageKey } from "@repo/contracts/cms-legal";

import { createClient } from "@/lib/supabase/server";
import {
  getAboutHeadersAdmin,
  getAboutPageAdmin,
  getClosingCtaAdmin,
  getContactPageAdmin,
  getLegalPageAdmin,
  getOfferPageAdmin,
  getWorkshopsPageAdmin,
  getPricesPageAdmin,
  getServicePageAdmin,
  getSiteContactAdmin,
  getSpecialistsPageAdmin,
  getEducationPageAdmin,
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
  getSpecialistPublicProfileAdmin,
  createSpecialistMediaSignedUrl,
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
import {
  listPublishedArticles,
  listPublishedEbooks,
} from "@repo/supabase/education";
import { listPublicWorkshops } from "@repo/supabase/workshops";
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
  const model = mapHomeSectionsViewModel(
    sections,
    (path) => supportAreaImageUrl(client, path),
    specialists,
  );
  return {
    ...model,
    specialists: await Promise.all(
      model.specialists.map(async (specialist) => {
        const profile = await getSpecialistPublicProfileAdmin(
          client,
          specialist.id,
        );
        return {
          ...specialist,
          portraitUrl: await createSpecialistMediaSignedUrl(
            client,
            profile?.portraitPhotoUrl ?? profile?.profilePhotoUrl ?? null,
          ),
        };
      }),
    ),
  };
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
  const [story, articles, ebooks, workshops] = await Promise.all([
    getHomeStoryAdmin(client),
    listPublishedArticles(client),
    listPublishedEbooks(client),
    listPublicWorkshops(client),
  ]);
  return {
    ...mapHomeStoryViewModel(story, (path) =>
      supportAreaImageUrl(client, path),
    ),
    mediaOptions: {
      articles: articles.map((one) => ({
        id: one.id,
        title: one.title,
        imageUrl: supportAreaImageUrl(client, one.coverPath),
      })),
      ebooks: ebooks.map((one) => ({
        id: one.id,
        title: one.title,
        imageUrl: supportAreaImageUrl(client, one.coverPath),
      })),
      workshops: workshops
        .filter(
          (one) =>
            one.status === "published" && new Date(one.endsAt) > new Date(),
        )
        .map((one) => ({
          id: one.id,
          title: one.title,
          imageUrl: one.coverPath
            ? supportAreaImageUrl(client, one.coverPath)
            : null,
          detail: new Intl.DateTimeFormat("pl-PL", {
            dateStyle: "medium",
            timeZone: "Europe/Warsaw",
          }).format(new Date(one.startsAt)),
        })),
    },
  };
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
  const state = await getHomeSectionsAdmin(client);
  const content = state.draft.roomsPeek ?? defaultHomeRoomsGallery;
  return {
    ...mapRoomsPeekModel(images.map((own) => own.length)),
    ...mapContentViewModel({
      ...state,
      draft: content,
      published: state.published
        ? (state.published.roomsPeek ?? defaultHomeRoomsGallery)
        : null,
    }),
  };
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

/** O nas: its words, with the story's photo address to preview. */
export async function loadAboutPage() {
  const client = await createClient();
  const model = mapContentViewModel(await getAboutPageAdmin(client));
  const path = model.content.story.imagePath;
  return {
    ...model,
    storyImageUrl: path ? supportAreaImageUrl(client, path) : null,
  };
}

export async function loadAboutHeaders() {
  return mapContentViewModel(await getAboutHeadersAdmin(await createClient()));
}

export async function loadSpecialistsPage() {
  return mapContentViewModel(
    await getSpecialistsPageAdmin(await createClient()),
  );
}

export async function loadEducationPage() {
  return mapContentViewModel(await getEducationPageAdmin(await createClient()));
}

export async function loadOfferPage() {
  return mapContentViewModel(await getOfferPageAdmin(await createClient()));
}

export async function loadWorkshopsPage() {
  return mapContentViewModel(await getWorkshopsPageAdmin(await createClient()));
}

export async function loadServicePage() {
  return mapContentViewModel(await getServicePageAdmin(await createClient()));
}

export async function loadPricesPage() {
  return mapContentViewModel(await getPricesPageAdmin(await createClient()));
}

export async function loadLegalPage(page: LegalPageKey) {
  return mapContentViewModel(
    await getLegalPageAdmin(await createClient(), page),
  );
}

export async function loadContactPage() {
  return mapContentViewModel(await getContactPageAdmin(await createClient()));
}

export async function loadClosingCta() {
  return mapContentViewModel(await getClosingCtaAdmin(await createClient()));
}

export async function loadSiteContact() {
  return mapContentViewModel(await getSiteContactAdmin(await createClient()));
}
