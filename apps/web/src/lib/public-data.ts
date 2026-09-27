import {
  createSpecialistMediaSignedUrl,
  getPublicCenterProfile,
  getPublicServiceBySlug,
  getPublishedHomeContent,
  getPublishedSpecialistBySlug,
  getSpecialistSlugRedirect,
  listPublicLocations,
  listPublishedRoomProfiles,
  listRoomImages,
  listPublicServices,
  listPublicSpecialistOffersForService,
  listPublishedSpecialists,
} from "@repo/supabase";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";

// Everything the public pages read from Supabase, in one place. Each
// loader is deduplicated within a render (React cache) and never throws:
// if the database cannot be reached or the environment is not configured,
// it logs the error and returns an empty result, so the site still renders
// (with its own content) instead of failing. Pages are prerendered and
// revalidated (see app/layout.tsx), and /api/revalidate refreshes a path on
// demand when the CMS publishes.

export type PublicService = Awaited<
  ReturnType<typeof listPublicServices>
>[number];
export type PublicSpecialist = Awaited<
  ReturnType<typeof listPublishedSpecialists>
>[number];
export type PublicOffer = Awaited<
  ReturnType<typeof listPublicSpecialistOffersForService>
>[number];
export type PublicLocation = Awaited<
  ReturnType<typeof listPublicLocations>
>[number];
export type PublicCenter = NonNullable<
  Awaited<ReturnType<typeof getPublicCenterProfile>>
>;

type Client = ReturnType<typeof createPublicClient>;

async function load<T>(
  what: string,
  query: (client: Client) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query(createPublicClient());
  } catch (error) {
    console.error(`[public-data] ${what} failed:`, error);
    return fallback;
  }
}

export const getCenter = cache(() =>
  load("center profile", getPublicCenterProfile, null),
);

export const getLocations = cache(() =>
  load("locations", listPublicLocations, []),
);

/** The home hero's CMS fields, published from the admin's /cms. */
export const getHomeContent = cache(() =>
  load("home content", getPublishedHomeContent, null),
);

/** Published room profiles with their photos, edited in the admin's /gabinety. */
export const getRooms = cache(() =>
  load(
    "rooms",
    async (client) => {
      const profiles = await listPublishedRoomProfiles(client);
      return Promise.all(
        profiles.map(async (profile) => {
          const images = await listRoomImages(client, profile.roomId);
          return {
            ...profile,
            images,
            mainImage:
              images.find((image) => image.isMain) ?? images[0] ?? null,
          };
        }),
      );
    },
    [],
  ),
);

export const getServices = cache(() =>
  load("services", listPublicServices, []),
);

export const getService = cache((slug: string) =>
  load(
    `service ${slug}`,
    (client) => getPublicServiceBySlug(client, slug),
    null,
  ),
);

/** Who offers a service, at what price and how long. */
export const getServiceOffers = cache((slug: string) =>
  load(
    `offers for ${slug}`,
    (client) => listPublicSpecialistOffersForService(client, slug),
    [],
  ),
);

/** The current slug of a specialist whose address changed, or null. */
export const getSpecialistRedirect = cache((slug: string) =>
  load(
    `slug redirect ${slug}`,
    (client) => getSpecialistSlugRedirect(client, slug),
    null,
  ),
);

/** A specialist with signed URLs for their photos (the bucket is private). */
export interface SpecialistWithMedia extends PublicSpecialist {
  portraitUrl: string | null;
  photoUrl: string | null;
}

async function withMedia(
  client: Client,
  specialist: PublicSpecialist,
): Promise<SpecialistWithMedia> {
  const sign = async (path: string | null) => {
    try {
      return await createSpecialistMediaSignedUrl(client, path);
    } catch (error) {
      console.error(`[public-data] photo ${path} failed:`, error);
      return null;
    }
  };
  const [portraitUrl, photoUrl] = await Promise.all([
    sign(specialist.portraitPhotoUrl),
    sign(specialist.profilePhotoUrl),
  ]);
  return { ...specialist, portraitUrl, photoUrl };
}

export const getSpecialists = cache(() =>
  load(
    "specialists",
    async (client) => {
      const specialists = await listPublishedSpecialists(client);
      return Promise.all(specialists.map((one) => withMedia(client, one)));
    },
    [],
  ),
);

export const getSpecialist = cache((slug: string) =>
  load(
    `specialist ${slug}`,
    async (client) => {
      const specialist = await getPublishedSpecialistBySlug(client, slug);
      return specialist ? withMedia(client, specialist) : null;
    },
    null,
  ),
);

/** Every service with its offers, for the price list. */
export const getPriceList = cache(async () => {
  const services = await getServices();
  return Promise.all(
    services.map(async (service) => ({
      service,
      offers: await getServiceOffers(service.slug),
    })),
  );
});
