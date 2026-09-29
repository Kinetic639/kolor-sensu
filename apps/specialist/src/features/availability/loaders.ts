import "server-only";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  RoomAvailabilityException,
  RoomOpeningHoursInterval,
} from "@repo/contracts";
import { addDays, DEFAULT_TIME_ZONE, mondayOf } from "@repo/scheduling";
import {
  getMyPublishedProfile,
  getMySpecialist,
  listActiveRoomsForSpecialist,
  listAvailabilityRules,
  listRoomExceptions,
  listRoomOccupancy,
  listRoomOpeningHours,
  listTimeOff,
  signSpecialistPhotos,
} from "@repo/supabase";
import { formatInTimeZone } from "date-fns-tz";
import type { AvailabilityParams } from "./search-params";
import { mapAvailabilityViewModel } from "./view-model";

/** The signed-in specialist's schedule, for the week and filters in the URL. */
export async function loadAvailability(params: AvailabilityParams) {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const specialist = await getMySpecialist(client, authorization.user.id);
  if (!specialist) return null;

  const now = new Date();
  const today = formatInTimeZone(now, DEFAULT_TIME_ZONE, "yyyy-MM-dd");
  const week = mondayOf(params.tydzien ?? today);
  const [rules, timeOff, rooms, occupancy] = await Promise.all([
    listAvailabilityRules(client, specialist.id),
    listTimeOff(client, specialist.id),
    listActiveRoomsForSpecialist(client),
    listRoomOccupancy(client, week, addDays(week, 6)),
  ]);

  // The room over the calendar: the one in the URL, else the first; none
  // when asked ("brak") or when the centre has no rooms.
  const roomId =
    params.gabinet === "brak"
      ? null
      : ((rooms.find((room) => room.id === params.gabinet) ?? rooms[0])?.id ??
        null);
  const [[hours, exceptions], photos] = await Promise.all([
    roomId
      ? Promise.all([
          listRoomOpeningHours(client, roomId),
          listRoomExceptions(client, roomId, week),
        ])
      : Promise.resolve([[], []] as [
          RoomOpeningHoursInterval[],
          RoomAvailabilityException[],
        ]),
    // Colleagues' pictures: the account's, else the profile photo.
    signSpecialistPhotos(
      client,
      occupancy
        .filter((one) => one.specialistId !== specialist.id)
        .map((one) =>
          one.specialistAvatarUrl ? null : one.specialistPhotoPath,
        ),
    ),
  ]);

  // The account's name, else the public profile's (accounts made by
  // invitation may have no name yet).
  const accountName = [
    authorization.profile.first_name,
    authorization.profile.last_name,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const specialistName =
    accountName ||
    (await getMyPublishedProfile(client, specialist.id))?.displayName ||
    "Specjalista";

  return {
    today,
    rules,
    specialistName,
    model: mapAvailabilityViewModel({
      rules,
      timeOff,
      rooms: rooms.map((room) => ({ id: room.id, name: room.name })),
      now,
      week,
      filters: { day: params.dzien, mode: params.forma },
      timeZone: DEFAULT_TIME_ZONE,
      specialistId: specialist.id,
      occupancy: occupancy.map((one) => ({
        ...one,
        specialistAvatarUrl:
          one.specialistAvatarUrl ??
          (one.specialistPhotoPath
            ? (photos.get(one.specialistPhotoPath) ?? null)
            : null),
      })),
      room: roomId ? { id: roomId, hours, exceptions } : null,
    }),
  };
}

/** One of the signed-in specialist's own windows (RLS returns only theirs). */
export async function findMyAvailabilityRule(id: string) {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const specialist = await getMySpecialist(client, authorization.user.id);
  if (!specialist) return null;
  const rules = await listAvailabilityRules(client, specialist.id);
  return rules.find((rule) => rule.id === id) ?? null;
}
