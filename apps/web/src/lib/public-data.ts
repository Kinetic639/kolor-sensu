import {
  createSpecialistMediaSignedUrl,
  getBookingWindow as readBookingWindow,
  getCompanyDetails,
  getCurrentAnnouncement,
  getPublicCenterProfile,
  getPublicServiceBySlug,
  getPublishedHomeContent,
  getPublishedRoomsPageContent,
  getPublishedSpecialistBySlug,
  getSpecialistSlugRedirect,
  listBookableCatalog,
  listPublicLocations,
  listPublishedRoomPlacements,
  listPublishedRoomProfiles,
  listRoomImages,
  listPublicServices,
  listServiceCatalogs,
  listPublicOffersForSpecialist,
  listPublicSpecialistOffersForService,
  listPublishedSpecialists,
} from "@repo/supabase";
import {
  arrangeOffer,
  defaultRoomsPageContent,
  flattenOffer,
} from "@repo/contracts";
import { intakeServiceSlugs } from "@repo/supabase/intakes";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { groupRoomsByLocation } from "./rooms-by-location";

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

/** Which optional sections /gabinety shows, set in the admin's CMS. */
export const getRoomsPageContent = cache(() =>
  load(
    "rooms page content",
    getPublishedRoomsPageContent,
    defaultRoomsPageContent,
  ),
);

/**
 * The /gabinety page: each location with its published rooms and photos,
 * edited in the admin's /gabinety and centre settings.
 */
export const getRoomsByLocation = cache(() =>
  load(
    "rooms",
    async (client) => {
      const [locations, placements, profiles] = await Promise.all([
        listPublicLocations(client),
        listPublishedRoomPlacements(client),
        listPublishedRoomProfiles(client),
      ]);
      const images = (
        await Promise.all(
          placements.map((placement) =>
            listRoomImages(client, placement.roomId),
          ),
        )
      ).flat();
      return groupRoomsByLocation({ locations, placements, profiles, images });
    },
    [],
  ),
);

const readServices = cache(() => load("services", listPublicServices, []));

/**
 * The offer as the menu and the offer page show it: the services outside
 * a catalogue and the catalogues (with only their public services; an
 * empty one left out), in the order the centre arranged.
 */
export const getOffer = cache(async () => {
  const [services, catalogs] = await Promise.all([
    readServices(),
    load("service catalogues", listServiceCatalogs, []),
  ]);
  return arrangeOffer(services, catalogs);
});

/** Every public service, in the offer's order (its catalogues unfolded). */
export const getServices = cache(async () =>
  flattenOffer(await getOffer()).map((one) => one.service),
);

export type PublicOfferEntry = Awaited<ReturnType<typeof getOffer>>[number];

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

/** What one specialist offers, cheapest first (their profile page). */
export const getSpecialistOffers = cache((slug: string) =>
  load(
    `offers of ${slug}`,
    (client) => listPublicOffersForSpecialist(client, slug),
    [],
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

/** What can be booked online now (empty when bookings are off). */
export const getBookableCatalog = cache(() =>
  load("bookable offers", listBookableCatalog, { services: [], offers: [] }),
);

/**
 * The services that ask for the questionnaire before a first visit, by
 * slug (none when unknown: the visit's details then insist on it).
 */
export const getIntakeServiceSlugs = cache(() =>
  load("intake services", intakeServiceSlugs, new Set<string>()),
);

/** The centre's announcement for today: a bar above the header (or none). */
export const getAnnouncement = cache(() =>
  load("announcement", getCurrentAnnouncement, null),
);

/** The centre's company (its name, NIP, address), for the footer. */
export const getCompany = cache(() => load("company", getCompanyDetails, null));

/** The centre's time zone and booking horizon. */
export const getBookingWindow = cache(() =>
  load("booking window", readBookingWindow, null),
);
