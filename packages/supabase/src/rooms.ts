import {
  roomAvailabilityExceptionCreateSchema,
  roomCreateSchema,
  roomOpeningHoursReplaceSchema,
  roomPublicProfileSchema,
  roomUpdateSchema,
  type AdminRoomDetail,
  type AdminRoomSummary,
  type EffectiveRoomAvailabilityInput,
  type Room,
  type RoomAvailabilityException,
  type RoomAvailabilityExceptionCreate,
  type RoomCreate,
  type RoomOpeningHoursInterval,
  type RoomOpeningHoursIntervalInput,
  type RoomPublicProfile,
  type RoomPublicProfileInput,
  type RoomTimeInterval,
  type RoomUpdate,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

type RoomWithLocationRow = RoomRow & {
  locations: { name: string; slug: string };
};

type RoomSummaryRow = RoomWithLocationRow & {
  room_public_profiles: { published: boolean } | null;
  room_opening_hours: { id: string }[];
  room_availability_exceptions: { id: string }[];
};

type PublicProfileRow =
  Database["public"]["Tables"]["room_public_profiles"]["Row"];
type OpeningHoursRow =
  Database["public"]["Tables"]["room_opening_hours"]["Row"];
type AvailabilityExceptionRow =
  Database["public"]["Tables"]["room_availability_exceptions"]["Row"];

const normalizeTime = (value: string) => value.slice(0, 5);

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminRoomSummary(row: RoomWithLocationRow): AdminRoomSummary {
  return {
    ...mapRoom(row),
    locationName: row.locations.name,
    locationSlug: row.locations.slug,
    publicProfilePublished:
      "room_public_profiles" in row
        ? Boolean((row as RoomSummaryRow).room_public_profiles?.published)
        : false,
    hasOpeningHours:
      "room_opening_hours" in row
        ? (row as RoomSummaryRow).room_opening_hours.length > 0
        : false,
    upcomingExceptionCount:
      "room_availability_exceptions" in row
        ? (row as RoomSummaryRow).room_availability_exceptions.length
        : 0,
  };
}

function mapRoomDetail(row: RoomWithLocationRow): AdminRoomDetail {
  return {
    ...mapRoom(row),
    locationName: row.locations.name,
    locationSlug: row.locations.slug,
  };
}

function mapPublicProfile(row: PublicProfileRow): RoomPublicProfile {
  return {
    roomId: row.room_id,
    displayName: row.display_name,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    imagePath: row.image_path,
    accessibilityNotes: row.accessibility_notes,
    amenities: row.amenities,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOpeningHours(row: OpeningHoursRow): RoomOpeningHoursInterval {
  return {
    id: row.id,
    roomId: row.room_id,
    weekday: row.weekday,
    startsAt: normalizeTime(row.starts_at),
    endsAt: normalizeTime(row.ends_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAvailabilityException(
  row: AvailabilityExceptionRow,
): RoomAvailabilityException {
  return {
    id: row.id,
    roomId: row.room_id,
    date: row.date,
    type: row.type,
    startsAt: row.starts_at ? normalizeTime(row.starts_at) : null,
    endsAt: row.ends_at ? normalizeTime(row.ends_at) : null,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRoomsAdmin(
  client: SupabaseClient<Database>,
): Promise<AdminRoomSummary[]> {
  const { data, error } = await client
    .from("rooms")
    .select(
      "*, locations!inner(name, slug), room_public_profiles(published), room_opening_hours(id), room_availability_exceptions(id)",
    )
    .order("sort_order");

  if (error) throw error;
  return (data as RoomSummaryRow[]).map(mapAdminRoomSummary);
}

export async function getRoomByIdAdmin(
  client: SupabaseClient<Database>,
  id: string,
): Promise<AdminRoomDetail | null> {
  const { data, error } = await client
    .from("rooms")
    .select("*, locations!inner(name, slug)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRoomDetail(data as RoomWithLocationRow) : null;
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
  return data ? mapPublicProfile(data) : null;
}

export async function updateRoomPublicProfile(
  client: SupabaseClient<Database>,
  roomId: string,
  input: RoomPublicProfileInput,
): Promise<RoomPublicProfile> {
  const profile = roomPublicProfileSchema.parse(input);
  const { data, error } = await client
    .from("room_public_profiles")
    .upsert(
      {
        room_id: roomId,
        display_name: profile.displayName,
        short_description: profile.shortDescription,
        long_description: profile.longDescription,
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
  return mapPublicProfile(data);
}

export async function getRoomOpeningHours(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomOpeningHoursInterval[]> {
  const { data, error } = await client
    .from("room_opening_hours")
    .select("*")
    .eq("room_id", roomId)
    .order("weekday")
    .order("starts_at");

  if (error) throw error;
  return data.map(mapOpeningHours);
}

export async function replaceRoomOpeningHours(
  client: SupabaseClient<Database>,
  roomId: string,
  intervals: RoomOpeningHoursIntervalInput[],
): Promise<RoomOpeningHoursInterval[]> {
  const parsed = roomOpeningHoursReplaceSchema.parse({ roomId, intervals });
  const { data, error } = await client.rpc("replace_room_opening_hours", {
    p_room_id: parsed.roomId,
    p_intervals: parsed.intervals.map((interval) => ({
      weekday: interval.weekday,
      starts_at: normalizeTime(interval.startsAt),
      ends_at: normalizeTime(interval.endsAt),
    })),
  });

  if (error) throw error;
  return data.map(mapOpeningHours);
}

export async function listRoomAvailabilityExceptions(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomAvailabilityException[]> {
  const { data, error } = await client
    .from("room_availability_exceptions")
    .select("*")
    .eq("room_id", roomId)
    .order("date")
    .order("starts_at");

  if (error) throw error;
  return data.map(mapAvailabilityException);
}

export async function createRoomAvailabilityException(
  client: SupabaseClient<Database>,
  input: RoomAvailabilityExceptionCreate,
): Promise<RoomAvailabilityException> {
  const exception = roomAvailabilityExceptionCreateSchema.parse(input);
  const { data, error } = await client
    .from("room_availability_exceptions")
    .insert({
      room_id: exception.roomId,
      date: exception.date,
      type: exception.type,
      starts_at: exception.startsAt,
      ends_at: exception.endsAt,
      reason: exception.reason,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapAvailabilityException(data);
}

export async function updateRoomAvailabilityException(
  client: SupabaseClient<Database>,
  id: string,
  input: RoomAvailabilityExceptionCreate,
): Promise<RoomAvailabilityException> {
  const exception = roomAvailabilityExceptionCreateSchema.parse(input);
  const { data, error } = await client
    .from("room_availability_exceptions")
    .update({
      room_id: exception.roomId,
      date: exception.date,
      type: exception.type,
      starts_at: exception.startsAt,
      ends_at: exception.endsAt,
      reason: exception.reason,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapAvailabilityException(data);
}

export async function removeRoomAvailabilityException(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await client
    .from("room_availability_exceptions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getActiveRoomResourceData(
  client: SupabaseClient<Database>,
  roomId: string,
) {
  const room = await getRoomByIdAdmin(client, roomId);
  if (!room?.active) return null;
  const [openingHours, availabilityExceptions, publicProfile] =
    await Promise.all([
      getRoomOpeningHours(client, roomId),
      listRoomAvailabilityExceptions(client, roomId),
      getRoomPublicProfileAdmin(client, roomId),
    ]);
  return { room, openingHours, availabilityExceptions, publicProfile };
}

const toMinutes = (value: string) => {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
};
const fromMinutes = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function calculateRoomAvailabilityForDate({
  roomActive,
  weekday,
  openingHours,
  exceptions,
}: EffectiveRoomAvailabilityInput): RoomTimeInterval[] {
  if (
    !roomActive ||
    exceptions.some((exception) => exception.type === "closed_all_day")
  ) {
    return [];
  }

  let ranges = openingHours
    .filter((interval) => interval.weekday === weekday)
    .map((interval) => [
      toMinutes(interval.startsAt),
      toMinutes(interval.endsAt),
    ]);

  for (const exception of exceptions) {
    if (!exception.startsAt || !exception.endsAt) continue;
    const startsAt = toMinutes(exception.startsAt);
    const endsAt = toMinutes(exception.endsAt);
    if (exception.type === "extra_available_interval") {
      ranges.push([startsAt, endsAt]);
      continue;
    }
    ranges = ranges.flatMap(([start, end]) => {
      if (endsAt <= start! || startsAt >= end!) return [[start!, end!]];
      return [
        ...(startsAt > start! ? [[start!, startsAt]] : []),
        ...(endsAt < end! ? [[endsAt, end!]] : []),
      ];
    });
  }

  const merged = ranges
    .filter(([start, end]) => start! < end!)
    .sort((left, right) => left[0]! - right[0]!)
    .reduce<number[][]>((result, current) => {
      const last = result.at(-1);
      if (!last || current[0]! > last[1]!)
        result.push([...current] as number[]);
      else last[1] = Math.max(last[1]!, current[1]!);
      return result;
    }, []);

  return merged.map(([startsAt, endsAt]) => ({
    startsAt: fromMinutes(startsAt!),
    endsAt: fromMinutes(endsAt!),
  }));
}

export const roomMappers = {
  room: mapRoom,
  adminRoomSummary: mapAdminRoomSummary,
  roomDetail: mapRoomDetail,
  publicProfile: mapPublicProfile,
  openingHours: mapOpeningHours,
  availabilityException: mapAvailabilityException,
};
