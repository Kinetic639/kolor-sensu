import {
  roomAvailabilityExceptionCreateSchema,
  roomCreateSchema,
  roomOpeningHoursIntervalSchema,
  roomPublicProfileSchema,
  roomUpdateSchema,
  type AdminRoomSummary,
  type Room,
  type RoomAvailabilityException,
  type RoomCreate,
  type RoomOpeningHoursInterval,
  type RoomOpeningHoursIntervalInput,
  type RoomImage,
  type RoomPlacement,
  type RoomPublicProfile,
  type RoomUpdate,
} from "@repo/contracts";
import type { Database, Json } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { readRichText } from "./rich-text";
import { validateSpecialistImage } from "./specialists";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

type RoomWithLocationRow = RoomRow & {
  locations: { name: string; slug: string };
};

type RoomSummaryRow = RoomWithLocationRow & {
  // One-to-one: the room's public profile, if it has one.
  room_public_profiles: { published: boolean } | null;
  room_opening_hours: { weekday: number }[];
  // Only today's and later ones (filtered in the query).
  room_availability_exceptions: { id: string }[];
};

// Today's date where the centre is, as the exceptions' `date` column
// stores it (YYYY-MM-DD).
function centreToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(now);
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    active: row.active,
    publiclyVisible: row.publicly_visible,
    capacity: row.capacity,
    sortOrder: row.sort_order,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminRoomSummary(row: RoomSummaryRow): AdminRoomSummary {
  return {
    ...mapRoom(row),
    locationName: row.locations.name,
    locationSlug: row.locations.slug,
    publicProfilePublished: row.room_public_profiles?.published ?? false,
    openWeekdays: [
      ...new Set(row.room_opening_hours.map((one) => one.weekday)),
    ].sort((a, b) => a - b),
    upcomingExceptionCount: row.room_availability_exceptions.length,
  };
}

export async function listRoomsAdmin(
  client: SupabaseClient<Database>,
): Promise<AdminRoomSummary[]> {
  const { data, error } = await client
    .from("rooms")
    .select(
      `
        *,
        locations!inner (name, slug),
        room_public_profiles (published),
        room_opening_hours (weekday),
        room_availability_exceptions (id)
      `,
    )
    .gte("room_availability_exceptions.date", centreToday())
    .order("sort_order");

  if (error) throw error;
  return (data as unknown as RoomSummaryRow[]).map(mapAdminRoomSummary);
}

export async function getRoomByIdAdmin(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Room | null> {
  const { data, error } = await client
    .from("rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRoom(data) : null;
}

export async function createRoom(
  client: SupabaseClient<Database>,
  input: RoomCreate,
): Promise<Room> {
  const room = roomCreateSchema.parse(input);
  const { data, error } = await client
    .from("rooms")
    .insert({
      location_id: room.locationId,
      name: room.name,
      slug: room.slug,
      description: room.description,
      active: room.active,
      publicly_visible: room.publiclyVisible,
      capacity: room.capacity,
      sort_order: room.sortOrder,
      color: room.color,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapRoom(data);
}

export async function updateRoom(
  client: SupabaseClient<Database>,
  id: string,
  input: RoomUpdate,
): Promise<Room> {
  const patch = roomUpdateSchema.parse(input);
  const { data, error } = await client
    .from("rooms")
    .update({
      location_id: patch.locationId,
      name: patch.name,
      slug: patch.slug,
      description: patch.description,
      active: patch.active,
      publicly_visible: patch.publiclyVisible,
      capacity: patch.capacity,
      sort_order: patch.sortOrder,
      color: patch.color,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapRoom(data);
}

export async function disableRoom(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Room> {
  return updateRoom(client, id, { active: false });
}

export async function listActiveRoomsForSpecialist(
  client: SupabaseClient<Database>,
): Promise<Room[]> {
  const { data, error } = await client
    .from("rooms")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data.map(mapRoom);
}

type RoomPublicProfileRow =
  Database["public"]["Tables"]["room_public_profiles"]["Row"];

function mapRoomPublicProfile(row: RoomPublicProfileRow): RoomPublicProfile {
  return {
    roomId: row.room_id,
    displayName: row.display_name,
    shortDescription: row.short_description,
    longDescription: readRichText(row.long_description),
    imagePath: row.image_path,
    accessibilityNotes: row.accessibility_notes,
    amenities: row.amenities,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRoomPublicProfileAdmin(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomPublicProfile | null> {
  const { data, error } = await client
    .from("room_public_profiles")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRoomPublicProfile(data) : null;
}

/** Creates or replaces the room's website profile (admins only, by RLS). */
export async function upsertRoomPublicProfile(
  client: SupabaseClient<Database>,
  roomId: string,
  input: z.input<typeof roomPublicProfileSchema>,
): Promise<RoomPublicProfile> {
  const profile = roomPublicProfileSchema.parse(input);
  const { data, error } = await client
    .from("room_public_profiles")
    .upsert(
      {
        room_id: roomId,
        display_name: profile.displayName,
        short_description: profile.shortDescription,
        long_description: profile.longDescription as unknown as Json,
        image_path: profile.imagePath,
        accessibility_notes: profile.accessibilityNotes,
        amenities: profile.amenities,
        published: profile.published,
      },
      { onConflict: "room_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapRoomPublicProfile(data);
}

/**
 * Published profiles of active, publicly visible rooms (RLS adds the room
 * conditions for anonymous readers, who cannot read `rooms` itself).
 */
export async function listPublishedRoomProfiles(
  client: SupabaseClient<Database>,
): Promise<RoomPublicProfile[]> {
  const { data, error } = await client
    .from("room_public_profiles")
    .select("*")
    .eq("published", true)
    .order("display_name");

  if (error) throw error;
  return data.map(mapRoomPublicProfile);
}

/** Which published room belongs to which location, in display order. */
export async function listPublishedRoomPlacements(
  client: SupabaseClient<Database>,
): Promise<RoomPlacement[]> {
  const { data, error } = await client.rpc("list_published_room_placements");
  if (error) throw error;
  return data.map((row) => ({
    roomId: row.room_id,
    locationId: row.location_id,
    sortOrder: row.sort_order,
  }));
}

const roomMediaBucket = "room-media";
const roomImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type RoomImageRow = Database["public"]["Tables"]["room_images"]["Row"];

function mapRoomImage(row: RoomImageRow, url: string): RoomImage {
  return {
    id: row.id,
    roomId: row.room_id,
    storagePath: row.storage_path,
    position: row.position,
    isMain: row.is_main,
    url,
  };
}

/** Each room's photos live in a folder named after the room. */
export function buildRoomImagePath(
  roomId: string,
  mimeType: keyof typeof roomImageExtensions,
  uniqueId: string,
): string {
  return `${roomId}/${uniqueId}.${roomImageExtensions[mimeType]}`;
}

/** A room's photos in gallery order (readers see only published rooms). */
export async function listRoomImages(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomImage[]> {
  const { data, error } = await client
    .from("room_images")
    .select("*")
    .eq("room_id", roomId)
    .order("position");

  if (error) throw error;
  const bucket = client.storage.from(roomMediaBucket);
  return data.map((row) =>
    mapRoomImage(row, bucket.getPublicUrl(row.storage_path).data.publicUrl),
  );
}

/**
 * Uploads a photo and adds it at the end of the room's gallery (admins only).
 * If the room already has the maximum of photos, the file is removed again.
 */
export async function uploadRoomImage(
  client: SupabaseClient<Database>,
  roomId: string,
  file: File,
): Promise<string> {
  const problem = validateSpecialistImage(file);
  if (problem) throw new Error(problem);

  const bucket = client.storage.from(roomMediaBucket);
  const path = buildRoomImagePath(
    roomId,
    file.type as keyof typeof roomImageExtensions,
    crypto.randomUUID(),
  );
  const { error: uploadError } = await bucket.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await client.rpc("add_room_image", {
    p_room_id: roomId,
    p_storage_path: path,
  });
  if (error) {
    await bucket.remove([path]);
    throw error;
  }
  return data;
}

export async function removeRoomImage(
  client: SupabaseClient<Database>,
  imageId: string,
): Promise<void> {
  const { data: path, error } = await client.rpc("remove_room_image", {
    p_image_id: imageId,
  });
  if (error) throw error;

  // The photo is already gone from the room; a leftover file only wastes space.
  const { error: removeError } = await client.storage
    .from(roomMediaBucket)
    .remove([path]);
  if (removeError)
    console.error("[rooms] photo file not removed:", removeError);
}

/** Saves the gallery order: every photo of the room, first to last. */
export async function reorderRoomImages(
  client: SupabaseClient<Database>,
  roomId: string,
  imageIds: string[],
): Promise<void> {
  const { error } = await client.rpc("reorder_room_images", {
    p_room_id: roomId,
    p_image_ids: imageIds,
  });
  if (error) throw error;
}

export async function setRoomMainImage(
  client: SupabaseClient<Database>,
  imageId: string,
): Promise<void> {
  const { error } = await client.rpc("set_room_main_image", {
    p_image_id: imageId,
  });
  if (error) throw error;
}

type OpeningHoursRow = Pick<
  Database["public"]["Tables"]["room_opening_hours"]["Row"],
  | "id"
  | "room_id"
  | "weekday"
  | "starts_at"
  | "ends_at"
  | "created_at"
  | "updated_at"
>;
type RoomExceptionRow =
  Database["public"]["Tables"]["room_availability_exceptions"]["Row"];

const shortTime = (time: string) => time.slice(0, 5);

function mapOpeningHours(row: OpeningHoursRow): RoomOpeningHoursInterval {
  return {
    id: row.id,
    roomId: row.room_id,
    weekday: row.weekday,
    startsAt: shortTime(row.starts_at),
    endsAt: shortTime(row.ends_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoomException(row: RoomExceptionRow): RoomAvailabilityException {
  return {
    id: row.id,
    roomId: row.room_id,
    date: row.date,
    type: row.type,
    startsAt: row.starts_at ? shortTime(row.starts_at) : null,
    endsAt: row.ends_at ? shortTime(row.ends_at) : null,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The room's weekly opening hours, Monday first. */
export async function listRoomOpeningHours(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomOpeningHoursInterval[]> {
  const { data, error } = await client
    .from("room_opening_hours")
    .select("id, room_id, weekday, starts_at, ends_at, created_at, updated_at")
    .eq("room_id", roomId)
    .order("weekday")
    .order("starts_at");

  if (error) throw error;
  return data.map(mapOpeningHours);
}

/**
 * Replaces the room's whole week at once (admins only). An empty list
 * removes the hours: the room is then not limited to any.
 */
export async function replaceRoomOpeningHours(
  client: SupabaseClient<Database>,
  roomId: string,
  intervals: RoomOpeningHoursIntervalInput[],
): Promise<void> {
  const parsed = intervals.map((one) =>
    roomOpeningHoursIntervalSchema.parse(one),
  );
  const { error } = await client.rpc("replace_room_opening_hours", {
    p_room_id: roomId,
    p_intervals: parsed.map((one) => ({
      weekday: one.weekday,
      starts_at: one.startsAt,
      ends_at: one.endsAt,
    })),
  });
  if (error) throw error;
}

/** The room's exceptions (closed days, blocked or extra hours) from a date. */
export async function listRoomExceptions(
  client: SupabaseClient<Database>,
  roomId: string,
  fromDate: string,
): Promise<RoomAvailabilityException[]> {
  const { data, error } = await client
    .from("room_availability_exceptions")
    .select("*")
    .eq("room_id", roomId)
    .gte("date", fromDate)
    .order("date")
    .order("starts_at");

  if (error) throw error;
  return data.map(mapRoomException);
}

export async function addRoomException(
  client: SupabaseClient<Database>,
  input: z.input<typeof roomAvailabilityExceptionCreateSchema>,
): Promise<void> {
  const exception = roomAvailabilityExceptionCreateSchema.parse(input);
  const { error } = await client.from("room_availability_exceptions").insert({
    room_id: exception.roomId,
    date: exception.date,
    type: exception.type,
    starts_at: exception.startsAt,
    ends_at: exception.endsAt,
    reason: exception.reason || null,
  });
  if (error) throw error;
}

export async function deleteRoomException(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await client
    .from("room_availability_exceptions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export const roomMappers = {
  room: mapRoom,
  adminRoomSummary: mapAdminRoomSummary,
  publicProfile: mapRoomPublicProfile,
};
