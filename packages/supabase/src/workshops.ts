import {
  workshopCreateSchema,
  workshopUpdateSchema,
  type PublicWorkshopDetail,
  type PublicWorkshopSummary,
  type Workshop,
  type WorkshopCreate,
  type WorkshopStatus,
  type WorkshopUpdate,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listPublicRooms } from "./rooms";

type WorkshopRow = Database["public"]["Tables"]["workshops"]["Row"];

export interface AdminWorkshopSummary extends Workshop {
  specialistPublicSlug: string;
  specialistDisplayName: string;
  locationName: string | null;
  roomName: string | null;
}

type AdminWorkshopSummaryRow = WorkshopRow & {
  specialists: {
    public_slug: string;
    professional_title: string | null;
    specialist_public_profiles: { display_name: string } | null;
  };
  locations: { name: string } | null;
  rooms: { name: string } | null;
};

type PublicWorkshopQueryRow = Pick<
  WorkshopRow,
  | "id"
  | "slug"
  | "title"
  | "short_description"
  | "long_description"
  | "starts_at"
  | "ends_at"
  | "modality"
  | "price_minor"
  | "currency_code"
  | "capacity"
  | "registration_enabled"
  | "status"
  | "cover_image_path"
  | "room_id"
> & {
  specialists: {
    public_slug: string;
    professional_title: string | null;
    specialist_public_profiles: { display_name: string } | null;
  } | null;
  locations: {
    name: string;
    slug: string;
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
    city: string | null;
  } | null;
};

function mapWorkshop(row: WorkshopRow): Workshop {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    specialistId: row.specialist_id,
    locationId: row.location_id,
    roomId: row.room_id,
    modality: row.modality,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    capacity: row.capacity,
    registrationEnabled: row.registration_enabled,
    status: row.status,
    coverImagePath: row.cover_image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminWorkshopSummary(
  row: AdminWorkshopSummaryRow,
): AdminWorkshopSummary {
  return {
    ...mapWorkshop(row),
    specialistPublicSlug: row.specialists.public_slug,
    specialistDisplayName:
      row.specialists.specialist_public_profiles?.display_name ??
      row.specialists.public_slug,
    locationName: row.locations?.name ?? null,
    roomName: row.rooms?.name ?? null,
  };
}

function mapPublicWorkshopSummary(
  row: PublicWorkshopQueryRow,
): PublicWorkshopSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    modality: row.modality,
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    capacity: row.capacity,
    registrationEnabled: row.registration_enabled,
    status: row.status,
    coverImagePath: row.cover_image_path,
    specialist: row.specialists
      ? {
          publicSlug: row.specialists.public_slug,
          displayName:
            row.specialists.specialist_public_profiles?.display_name ??
            row.specialists.public_slug,
          professionalTitle: row.specialists.professional_title,
        }
      : null,
    location: row.locations
      ? {
          name: row.locations.name,
          slug: row.locations.slug,
          addressLine1: row.locations.address_line1,
          addressLine2: row.locations.address_line2,
          postalCode: row.locations.postal_code,
          city: row.locations.city,
        }
      : null,
  };
}

const adminWorkshopSelection = `
  *,
  specialists!inner (
    public_slug,
    professional_title,
    specialist_public_profiles ( display_name )
  ),
  locations ( name ),
  rooms ( name )
`;

export async function listWorkshopsAdmin(
  client: SupabaseClient<Database>,
): Promise<AdminWorkshopSummary[]> {
  const { data, error } = await client
    .from("workshops")
    .select(adminWorkshopSelection)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as AdminWorkshopSummaryRow[]).map(
    mapAdminWorkshopSummary,
  );
}

export async function getWorkshopByIdAdmin(
  client: SupabaseClient<Database>,
  id: string,
): Promise<AdminWorkshopSummary | null> {
  const { data, error } = await client
    .from("workshops")
    .select(adminWorkshopSelection)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data
    ? mapAdminWorkshopSummary(data as unknown as AdminWorkshopSummaryRow)
    : null;
}

export async function createWorkshop(
  client: SupabaseClient<Database>,
  input: WorkshopCreate,
): Promise<Workshop> {
  const workshop = workshopCreateSchema.parse(input);
  const { data, error } = await client
    .from("workshops")
    .insert({
      title: workshop.title,
      slug: workshop.slug,
      short_description: workshop.shortDescription,
      long_description: workshop.longDescription,
      specialist_id: workshop.specialistId,
      location_id: workshop.locationId,
      room_id: workshop.roomId,
      modality: workshop.modality,
      starts_at: workshop.startsAt,
      ends_at: workshop.endsAt,
      price_minor: workshop.priceMinor,
      currency_code: workshop.currencyCode,
      capacity: workshop.capacity,
      registration_enabled: workshop.registrationEnabled,
      cover_image_path: workshop.coverImagePath,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapWorkshop(data);
}

export async function updateWorkshop(
  client: SupabaseClient<Database>,
  id: string,
  input: WorkshopUpdate,
): Promise<Workshop> {
  const patch = workshopUpdateSchema.parse(input);
  const { data, error } = await client
    .from("workshops")
    .update({
      title: patch.title,
      slug: patch.slug,
      short_description: patch.shortDescription,
      long_description: patch.longDescription,
      specialist_id: patch.specialistId,
      location_id: patch.locationId,
      room_id: patch.roomId,
      modality: patch.modality,
      starts_at: patch.startsAt,
      ends_at: patch.endsAt,
      price_minor: patch.priceMinor,
      currency_code: patch.currencyCode,
      capacity: patch.capacity,
      registration_enabled: patch.registrationEnabled,
      cover_image_path: patch.coverImagePath,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapWorkshop(data);
}

/**
 * Every workshop lifecycle change is a guarded single-column transition:
 * the `.eq("status", ...)` list only matches rows currently in an allowed
 * source status, so publishing/cancelling/completing from the wrong state
 * fails loudly (PostgREST's "no rows returned" on `.single()`) instead of
 * silently overwriting an unrelated transition. There is no multi-table
 * invariant to copy atomically here (unlike the CMS/Specialist draft
 * models), so this stays a plain guarded UPDATE rather than a new
 * SECURITY DEFINER function -- RLS already restricts writes to Admin.
 */
async function transitionWorkshopStatus(
  client: SupabaseClient<Database>,
  id: string,
  fromStatuses: WorkshopStatus[],
  toStatus: WorkshopStatus,
): Promise<Workshop> {
  const { data, error } = await client
    .from("workshops")
    .update({ status: toStatus })
    .eq("id", id)
    .in("status", fromStatuses)
    .select("*")
    .single();

  if (error) throw error;
  return mapWorkshop(data);
}

export async function publishWorkshop(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Workshop> {
  return transitionWorkshopStatus(client, id, ["draft"], "published");
}

export async function cancelWorkshop(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Workshop> {
  return transitionWorkshopStatus(client, id, ["published"], "cancelled");
}

export async function completeWorkshop(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Workshop> {
  return transitionWorkshopStatus(client, id, ["published"], "completed");
}

export async function listMyLedWorkshops(
  client: SupabaseClient<Database>,
  specialistId: string,
): Promise<Workshop[]> {
  const { data, error } = await client
    .from("workshops")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return data.map(mapWorkshop);
}

const publicWorkshopSelection = `
  id,
  slug,
  title,
  short_description,
  long_description,
  starts_at,
  ends_at,
  modality,
  price_minor,
  currency_code,
  capacity,
  registration_enabled,
  status,
  cover_image_path,
  room_id,
  specialists (
    public_slug,
    professional_title,
    specialist_public_profiles ( display_name )
  ),
  locations ( name, slug, address_line1, address_line2, postal_code, city )
`;

/**
 * Upcoming published workshops, nearest-first, for the public /warsztaty
 * list -- one query with the specialist/location context embedded, no
 * N+1. Past/completed/cancelled workshops are deliberately omitted from
 * this list (see docs/architecture/workshops-domain.md); they remain
 * reachable at their own /warsztaty/[slug] URL.
 */
export async function listPublicWorkshops(
  client: SupabaseClient<Database>,
): Promise<PublicWorkshopSummary[]> {
  const { data, error } = await client
    .from("workshops")
    .select(publicWorkshopSelection)
    .eq("status", "published")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as PublicWorkshopQueryRow[]).map(
    mapPublicWorkshopSummary,
  );
}

/**
 * One workshop by slug for /warsztaty/[slug], for any non-draft status
 * (published, cancelled, or completed) -- a cancelled/completed workshop
 * stays addressable at its existing URL, it's just excluded from the
 * upcoming list above. A draft or unknown slug resolves to null, making
 * the two cases indistinguishable to the caller by design.
 */
export async function getPublicWorkshopBySlug(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<PublicWorkshopDetail | null> {
  const { data, error } = await client
    .from("workshops")
    .select(publicWorkshopSelection)
    .eq("slug", slug)
    .neq("status", "draft")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as PublicWorkshopQueryRow;
  const summary = mapPublicWorkshopSummary(row);

  let room: PublicWorkshopDetail["room"] = null;
  if (row.room_id) {
    // Anon has no grant on `rooms` at all -- listPublicRooms() is the
    // same two-query bridge-backed helper the /gabinety pages already
    // use, reused here rather than duplicating that resolution logic.
    const publicRooms = await listPublicRooms(client);
    const publicRoom = publicRooms.find((r) => r.roomId === row.room_id);
    room = publicRoom
      ? { displayName: publicRoom.displayName, slug: publicRoom.roomSlug }
      : null;
  }

  return {
    ...summary,
    longDescription: row.long_description,
    room,
  };
}

export const workshopMappers = {
  workshop: mapWorkshop,
  adminWorkshopSummary: mapAdminWorkshopSummary,
  publicWorkshopSummary: mapPublicWorkshopSummary,
};
