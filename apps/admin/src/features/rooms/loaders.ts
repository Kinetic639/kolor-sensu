import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_TIME_ZONE,
  mondayOf,
  summarizeOpeningHours,
} from "@repo/scheduling";
import {
  getRoomByIdAdmin,
  getRoomPublicProfileAdmin,
  listLocations,
  listRoomAvailabilityRules,
  listRoomExceptions,
  listRoomImages,
  listRoomOpeningHours,
  listRoomsAdmin,
  listTimeOffForSpecialists,
  signSpecialistPhotos,
} from "@repo/supabase";
import { formatInTimeZone } from "date-fns-tz";
import { mapRoomScheduleViewModel } from "./schedule-view-model";

// Rooms can be placed in any location the centre has, active or not.
function toLocationOptions(
  locations: Awaited<ReturnType<typeof listLocations>>,
) {
  return locations.map((location) => ({
    id: location.id,
    name: location.active ? location.name : `${location.name} (nieaktywna)`,
  }));
}

function centreToday(now = new Date()) {
  return formatInTimeZone(now, DEFAULT_TIME_ZONE, "yyyy-MM-dd");
}

export async function loadAdminRooms() {
  const client = await createClient();
  const [rooms, locations] = await Promise.all([
    listRoomsAdmin(client),
    listLocations(client),
  ]);
  return { rooms, locations: toLocationOptions(locations) };
}

/**
 * What every tab of a room shows: the room, its place, its opening hours
 * and the other rooms (to switch between them).
 */
async function readAdminRoom(roomId: string) {
  const client = await createClient();
  const [room, locations, rooms, openingHours] = await Promise.all([
    getRoomByIdAdmin(client, roomId),
    listLocations(client),
    listRoomsAdmin(client),
    listRoomOpeningHours(client, roomId),
  ]);
  if (!room) return null;
  const location = locations.find((one) => one.id === room.locationId);
  const summary = rooms.find((one) => one.id === room.id);
  return {
    room,
    // On the site only when the room is public and its profile published.
    onSite: room.publiclyVisible && Boolean(summary?.publicProfilePublished),
    locationName: location?.name ?? "Nieznana lokalizacja",
    // In full, for the location's tooltip in the header.
    address:
      [
        location?.addressLine1,
        location?.addressLine2,
        [location?.postalCode, location?.city].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ") || null,
    locations: toLocationOptions(locations),
    rooms: rooms.map((one) => ({
      id: one.id,
      name: one.name,
      active: one.active,
    })),
    openingHours,
    openingHoursLabel: summarizeOpeningHours(openingHours),
  };
}

/** Cached per request: the page and its breadcrumb share one load. */
export const loadAdminRoom = cache(readAdminRoom);

export type AdminRoomModel = NonNullable<
  Awaited<ReturnType<typeof loadAdminRoom>>
>;

/** The room's week: the hours specialists have taken, over its hours. */
export async function loadRoomSchedule(
  base: AdminRoomModel,
  week: string | null,
) {
  const client = await createClient();
  const now = new Date();
  const today = centreToday(now);
  const monday = mondayOf(week ?? today);
  const [rules, exceptions] = await Promise.all([
    listRoomAvailabilityRules(client, base.room.id),
    listRoomExceptions(client, base.room.id, monday),
  ]);
  const [timeOff, photos] = await Promise.all([
    listTimeOffForSpecialists(client, [
      ...new Set(rules.map((rule) => rule.specialistId)),
    ]),
    // The account's picture, else the published profile photo.
    signSpecialistPhotos(
      client,
      rules.map((rule) =>
        rule.specialistAvatarUrl ? null : rule.specialistPhotoPath,
      ),
    ),
  ]);
  return {
    today,
    model: mapRoomScheduleViewModel({
      rules: rules.map((rule) => ({
        ...rule,
        specialistAvatarUrl:
          rule.specialistAvatarUrl ??
          (rule.specialistPhotoPath
            ? (photos.get(rule.specialistPhotoPath) ?? null)
            : null),
      })),
      timeOff,
      hours: base.openingHours,
      exceptions,
      week: monday,
      now,
      timeZone: DEFAULT_TIME_ZONE,
    }),
  };
}

/** Upcoming closures and changed hours, from today. */
export async function loadRoomExceptions(roomId: string) {
  const client = await createClient();
  const today = centreToday();
  return { today, exceptions: await listRoomExceptions(client, roomId, today) };
}

export async function loadRoomProfile(roomId: string) {
  const client = await createClient();
  const [publicProfile, images] = await Promise.all([
    getRoomPublicProfileAdmin(client, roomId),
    listRoomImages(client, roomId),
  ]);
  return { publicProfile, images };
}

export type LocationOption = { id: string; name: string };

/** The profile and settings tabs' model (the room with its profile). */
export type AdminRoomDetailModel = AdminRoomModel &
  Awaited<ReturnType<typeof loadRoomProfile>>;
