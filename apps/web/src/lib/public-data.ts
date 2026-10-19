import {
  createSpecialistMediaSignedUrl,
  getBookingWindow as readBookingWindow,
  getCompanyDetails,
  getCurrentAnnouncement,
  getPublicCenterProfile,
  getPublicServiceBySlug,
  getPublishedCrisisHelp,
  getPublishedFirstSteps,
  getPublishedPageSeo,
  getPublishedHomeLocation,
  getPublishedNewsletterBand,
  getPublishedWhyUs,
  getPublishedHomeHeaders,
  getPublishedHomeContent,
  getPublishedHomeStory,
  getPublishedHomeThoughts,
  getPublishedHomeSections,
  getPublishedRoomsPageContent,
  getPublishedSupportAreas,
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
  supportAreaImageUrl,
} from "@repo/supabase";
import {
  arrangeOffer,
  defaultCrisisHelp,
  defaultHomeStory,
  defaultHomeThoughts,
  defaultHomeLocation,
  defaultNewsletterBand,
  defaultWhyUs,
  defaultFirstSteps,
  defaultHomeHeaders,
  defaultHomeSections,
  defaultRoomsPageContent,
  flattenOffer,
  defaultPageSeo,
  type PageSeoContent,
  type SeoPage,
} from "@repo/contracts";
import { intakeServiceSlugs } from "@repo/supabase/intakes";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { HomeHero, HomeStory } from "@/lib/home-content";
import type { HomeSections } from "@/lib/spotlight";
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

/**
 * The home hero's CMS fields, published from the admin's /cms (null until
 * then: the site's own hero), with its photo as an address.
 */
export const getHomeContent = cache(() =>
  load<HomeHero | null>(
    "home content",
    async (client) => {
      const content = await getPublishedHomeContent(client);
      if (!content) return null;
      return {
        ...content,
        imageUrl: content.imagePath
          ? supportAreaImageUrl(client, content.imagePath)
          : null,
      };
    },
    null,
  ),
);

/** Home → "Myśli, które się odmieniają", published (the site's until then). */
export const getHomeThoughts = cache(() =>
  load("home thoughts", getPublishedHomeThoughts, defaultHomeThoughts),
);

/**
 * Home → the story's steps, published (the site's until then), each photo
 * as an address.
 */
export const getHomeStory = cache(() =>
  load<HomeStory>(
    "home story",
    async (client) => {
      const story = await getPublishedHomeStory(client);
      return {
        steps: story.steps.map((step) => ({
          ...step,
          imageUrl: step.imagePath
            ? supportAreaImageUrl(client, step.imagePath)
            : null,
        })),
      };
    },
    {
      steps: defaultHomeStory.steps.map((step) => ({
        ...step,
        imageUrl: null,
      })),
    },
  ),
);

/** Home → Obszary wsparcia, published from the admin's /cms; null until then. */
export const getSupportAreas = cache(() =>
  load("support areas", getPublishedSupportAreas, null),
);

/**
 * Home → the sections' headers (eyebrow, title, description, call to
 * action), published from the admin's /cms (the site's own until then).
 */
export const getHomeHeaders = cache(() =>
  load("home headers", getPublishedHomeHeaders, defaultHomeHeaders),
);

/** Home → "Pierwszy krok", published from the admin's /cms (the site's own until then). */
export const getFirstSteps = cache(() =>
  load("first steps", getPublishedFirstSteps, defaultFirstSteps),
);

/** Home → "Dlaczego my", published from the admin's /cms (hidden until then). */
export const getWhyUs = cache(() =>
  load("why us", getPublishedWhyUs, defaultWhyUs),
);

/** Home → whether the newsletter band shows (hidden until published). */
export const getNewsletterBand = cache(() =>
  load("newsletter band", getPublishedNewsletterBand, defaultNewsletterBand),
);

/** Home → whether "Gdzie jesteśmy" shows (shown until published otherwise). */
export const getHomeLocation = cache(() =>
  load("home location", getPublishedHomeLocation, defaultHomeLocation),
);

/**
 * Home → the crisis strip's words and numbers, published from the admin's
 * /cms (the site's own until then). Never empty: on any failure, the
 * site's own numbers.
 */
export const getCrisisHelp = cache(() =>
  load("crisis help", getPublishedCrisisHelp, defaultCrisisHelp),
);

/**
 * Home → which specialist sections show, published from the admin's /cms
 * (the team until then), with the spotlight's own photo as an address.
 */
export const getHomeSections = cache(() =>
  load<HomeSections>(
    "home sections",
    async (client) => {
      const sections = await getPublishedHomeSections(client);
      const path = sections.spotlight.imagePath;
      return {
        ...sections,
        spotlightImage: path ? supportAreaImageUrl(client, path) : null,
      };
    },
    { ...defaultHomeSections, spotlightImage: null },
  ),
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

/** A page's search and sharing settings, with its picture as an address. */
export type PageSeo = PageSeoContent & { ogImageUrl: string | null };

/**
 * A page's search and sharing settings, published from the admin's /cms
 * (every field empty, the page's own, until then).
 */
export const getPageSeo = cache((page: SeoPage) =>
  load<PageSeo>(
    `${page} seo`,
    async (client) => {
      const seo = await getPublishedPageSeo(client, page);
      return {
        ...seo,
        ogImageUrl: seo.ogImagePath
          ? supportAreaImageUrl(client, seo.ogImagePath)
          : null,
      };
    },
    { ...defaultPageSeo, ogImageUrl: null },
  ),
);
