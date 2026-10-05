import "server-only";
import { listClosures } from "@repo/supabase/closures";

import { cache } from "react";

import {
  centreSettings,
  rooms as loadRooms,
  services as loadServices,
  specialistAvatars,
  specialistSummaries,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  calendarWindows,
  mondayOf,
  personalWeek,
  type CalendarPerson,
  type PersonalWeekView,
} from "@repo/scheduling";
import {
  createSpecialistMediaSignedUrl,
  getLatestSpecialistDraftAdmin,
  getProfileByIdAdmin,
  getSpecialistByIdAdmin,
  getSpecialistPublicProfileAdmin,
  listAvailabilityRulesForSpecialists,
  listPublishedSpecialists,
  listSpecialistOffersAdmin,
  listSpecialistOffersForAdmin,
  listTimeOffForSpecialists,
  listVisits,
} from "@repo/supabase";
import { specialistSplashAt } from "@repo/ui/public-site";
import { formatInTimeZone } from "date-fns-tz";
import {
  mapSpecialistDetailViewModel,
  mapSpecialistsListViewModel,
  offersBySpecialist,
  toSpecialistRow,
} from "./view-model";

// The team (Specjaliści): everyone with their week and offers for the
// roster, and a specialist's page. The weeks are read once for
// everyone (availability, time off, visits) and summed up per person; the
// team, rooms, services and pictures come from the kept reference data.

/** How far ahead the next visits are looked for. */
const AHEAD_DAYS = 28;

/** The centre's today and this week's Monday. */
async function centreToday(now = new Date()) {
  const { timezone: timeZone } = await centreSettings();
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  return { timeZone, today, monday: mondayOf(today) };
}

/** Each person's week (from its Monday), summed up, with the next visits. */
async function readWeeks(
  people: CalendarPerson[],
  week: string,
  timeZone: string,
  upcomingLimit = 3,
): Promise<Map<string, PersonalWeekView>> {
  if (!people.length) return new Map();
  const client = await createClient();
  const ids = people.map((one) => one.id);
  const sunday = addDays(week, 6);
  const [rules, timeOff, visits, rooms] = await Promise.all([
    listAvailabilityRulesForSpecialists(client, {
      specialistIds: ids,
      from: week,
      to: sunday,
    }),
    listTimeOffForSpecialists(client, ids),
    listVisits(client, { from: week, to: addDays(week, AHEAD_DAYS - 1) }),
    loadRooms(),
  ]);
  const expanded = calendarWindows({
    specialistIds: ids,
    rules,
    timeOff,
    from: week,
    to: sunday,
    timeZone,
  });
  // The days the whole centre is closed: shown, nothing to book.
  const closures = await listClosures(client);
  const input = {
    timeZone,
    closures,
    now: new Date(),
    people,
    // Only for the rooms' names and colours.
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      color: room.color,
      locationId: room.locationId,
      hours: [],
      exceptions: [],
    })),
    windows: expanded.windows,
    timeOff: expanded.timeOff,
    visits,
  };
  return new Map(
    people.map((person) => [
      person.id,
      personalWeek({ ...input, week, person, upcomingLimit }),
    ]),
  );
}

/** How many next visits a specialist's row lists. */
const NEXT_VISITS = 5;

/**
 * The team's roster: everyone with the week asked for (any of its days;
 * none: this one), and everyone's offers, read at once.
 */
export async function loadSpecialists(day: string | null = null) {
  const [{ timeZone, monday }, summaries, avatars, offers, services] =
    await Promise.all([
      centreToday(),
      specialistSummaries(),
      specialistAvatars(),
      createClient().then((client) => listSpecialistOffersAdmin(client)),
      loadServices(),
    ]);
  const week = day ? mondayOf(day) : monday;
  // The pictures kept between requests, by the published photo's path.
  const photos = new Map(
    summaries.flatMap((one) =>
      one.publicProfilePhotoUrl && avatars[one.id]
        ? [[one.publicProfilePhotoUrl, avatars[one.id]!] as const]
        : [],
    ),
  );
  const { items } = mapSpecialistsListViewModel(summaries, photos);
  const weeks = await readWeeks(
    items.map((item) => ({
      id: item.id,
      name: item.displayName,
      title: item.professionalTitle,
      avatarUrl: item.avatarUrl,
      color: item.color,
    })),
    week,
    timeZone,
    NEXT_VISITS,
  );
  return {
    week,
    thisWeek: monday,
    rows: items.flatMap((item) => {
      const view = weeks.get(item.id);
      return view ? [toSpecialistRow(item, view)] : [];
    }),
    offers: offersBySpecialist(offers, services),
  };
}

/**
 * A specialist's week on their page: the one asked for (any of its days),
 * else this one.
 */
export async function loadSpecialistWeek(
  person: CalendarPerson,
  day: string | null = null,
) {
  const { timeZone, today, monday } = await centreToday();
  const week = day ? mondayOf(day) : monday;
  const weeks = await readWeeks([person], week, timeZone);
  return { today, thisWeek: monday, week, view: weeks.get(person.id)! };
}

async function readAdminSpecialistDetail(specialistId: string) {
  const client = await createClient();
  const [specialist, draft, offers, services] = await Promise.all([
    getSpecialistByIdAdmin(client, specialistId),
    getLatestSpecialistDraftAdmin(client, specialistId),
    listSpecialistOffersForAdmin(client, specialistId),
    loadServices(),
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

/**
 * The watercolor the site paints behind a specialist: by their place among
 * the published profiles, the latest first (as the site orders them).
 */
export async function loadProfileSplash(specialistId: string) {
  const published = await listPublishedSpecialists(await createClient());
  return specialistSplashAt(
    published.findIndex((one) => one.specialistId === specialistId),
  );
}
