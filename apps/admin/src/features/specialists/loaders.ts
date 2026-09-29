import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  createSpecialistMediaSignedUrl,
  getLatestSpecialistDraftAdmin,
  getProfileByIdAdmin,
  getSpecialistByIdAdmin,
  getSpecialistPublicProfileAdmin,
  listServicesAdmin,
  listSpecialistOffersForAdmin,
  listSpecialistSummariesForAdmin,
  signSpecialistPhotos,
} from "@repo/supabase";
import {
  mapSpecialistDetailViewModel,
  mapSpecialistsListViewModel,
} from "./view-model";

export async function loadAdminSpecialists() {
  const client = await createClient();
  const summaries = await listSpecialistSummariesForAdmin(client);
  // Each picture: the account's, else the published profile photo.
  const photos = await signSpecialistPhotos(
    client,
    summaries.map((one) => (one.avatarUrl ? null : one.publicProfilePhotoUrl)),
  );
  return mapSpecialistsListViewModel(summaries, photos);
}

async function readAdminSpecialistDetail(specialistId: string) {
  const client = await createClient();
  const specialistPromise = getSpecialistByIdAdmin(client, specialistId);
  const [specialist, draft, offers, services] = await Promise.all([
    specialistPromise,
    getLatestSpecialistDraftAdmin(client, specialistId),
    listSpecialistOffersForAdmin(client, specialistId),
    listServicesAdmin(client),
  ]);

  if (!specialist) return null;

  const [identity, publicProfile] = await Promise.all([
    getProfileByIdAdmin(client, specialist.userId),
    getSpecialistPublicProfileAdmin(client, specialistId, specialist),
  ]);
  if (!identity) return null;

  const [
    publicProfilePhotoUrl,
    publicPortraitPhotoUrl,
    draftProfilePhotoUrl,
    draftPortraitPhotoUrl,
  ] = await Promise.all([
    createSpecialistMediaSignedUrl(
      client,
      publicProfile?.profilePhotoUrl ?? null,
    ),
    createSpecialistMediaSignedUrl(
      client,
      publicProfile?.portraitPhotoUrl ?? null,
    ),
    createSpecialistMediaSignedUrl(client, draft?.profilePhotoUrl ?? null),
    createSpecialistMediaSignedUrl(client, draft?.portraitPhotoUrl ?? null),
  ]);

  return mapSpecialistDetailViewModel({
    specialist,
    identity,
    publicProfile,
    draft,
    services,
    offers,
    media: {
      publicProfilePhotoUrl,
      publicPortraitPhotoUrl,
      draftProfilePhotoUrl,
      draftPortraitPhotoUrl,
    },
  });
}

/** Cached per request: the page and its breadcrumb share one load. */
export const loadAdminSpecialistDetail = cache(readAdminSpecialistDetail);
