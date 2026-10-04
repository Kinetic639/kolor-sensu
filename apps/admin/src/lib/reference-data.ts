import "server-only";
import {
  getCenterSettings,
  listRoomsAdmin,
  listServiceCatalogs,
  listServicesAdmin,
  listSpecialistSummariesForAdmin,
  signSpecialistPhotos,
} from "@repo/supabase";
import { CACHE_TAGS, cachedForCaller } from "./cached";

// The portal's reference data, kept between requests (./cached): read on
// nearly every page, changed rarely.

/** The centre's settings (its time zone, booking rules, …). */
export function centreSettings() {
  return cachedForCaller("centre-settings", [CACHE_TAGS.centre], (client) =>
    getCenterSettings(client),
  );
}

/** Every specialist, as the portal lists them. */
export function specialistSummaries() {
  return cachedForCaller("specialists", [CACHE_TAGS.specialists], (client) =>
    listSpecialistSummariesForAdmin(client),
  );
}

/**
 * The specialists' pictures, by id: the account's, else the published
 * profile photo (signed), else none (initials).
 */
export function specialistAvatars(): Promise<Record<string, string | null>> {
  return cachedForCaller(
    "specialist-avatars",
    [CACHE_TAGS.specialists],
    async (client) => {
      const list = await listSpecialistSummariesForAdmin(client);
      const photos = await signSpecialistPhotos(
        client,
        list.map((one) => (one.avatarUrl ? null : one.publicProfilePhotoUrl)),
      );
      return Object.fromEntries(
        list.map((one) => [
          one.id,
          one.avatarUrl ??
            (one.publicProfilePhotoUrl
              ? (photos.get(one.publicProfilePhotoUrl) ?? null)
              : null),
        ]),
      );
    },
  );
}

export function services() {
  return cachedForCaller("services", [CACHE_TAGS.services], (client) =>
    listServicesAdmin(client),
  );
}

export function rooms() {
  return cachedForCaller("rooms", [CACHE_TAGS.rooms], (client) =>
    listRoomsAdmin(client),
  );
}

/** The offer's catalogues (the menu's groups), kept with the services. */
export function serviceCatalogs() {
  return cachedForCaller("service-catalogs", [CACHE_TAGS.services], (client) =>
    listServiceCatalogs(client),
  );
}
