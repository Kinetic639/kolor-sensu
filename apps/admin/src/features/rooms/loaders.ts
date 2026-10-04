import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, summarizeOpeningHours } from "@repo/scheduling";
import {
  getRoomByIdAdmin,
  getRoomPublicProfileAdmin,
  listLocations,
  listRoomExceptions,
  listRoomImages,
  listRoomOpeningHours,
  listRoomsAdmin,
} from "@repo/supabase";
import { formatInTimeZone } from "date-fns-tz";

// Rooms can be placed in any location the centre has, active or not.
export function toLocationOptions(
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
