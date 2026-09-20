import {
  roomCreateSchema,
  roomUpdateSchema,
  type AdminRoomSummary,
  type Room,
  type RoomCreate,
  type RoomUpdate,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

type RoomWithLocationRow = RoomRow & {
  locations: { name: string; slug: string };
};

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
  };
}

export async function listRoomsAdmin(
  client: SupabaseClient<Database>,
): Promise<AdminRoomSummary[]> {
  const { data, error } = await client
    .from("rooms")
    .select("*, locations!inner(name, slug)")
    .order("sort_order");

  if (error) throw error;
  return (data as RoomWithLocationRow[]).map(mapAdminRoomSummary);
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

export const roomMappers = {
  room: mapRoom,
  adminRoomSummary: mapAdminRoomSummary,
};
