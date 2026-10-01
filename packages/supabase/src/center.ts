import {
  centerPublicProfileUpdateSchema,
  centerSettingsUpdateSchema,
  locationCreateSchema,
  locationUpdateSchema,
  type CenterPublicProfile,
  type CenterPublicProfileUpdate,
  type CenterSettings,
  type CenterSettingsUpdate,
  type Location,
  type LocationCreate,
  type LocationUpdate,
  type PublicCenterProfile,
  type PublicLocation,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type CenterSettingsRow = Database["public"]["Tables"]["center_settings"]["Row"];
type CenterPublicProfileRow =
  Database["public"]["Tables"]["center_public_profile"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

type PublicCenterProfileQueryRow = Pick<
  CenterPublicProfileRow,
  | "display_name"
  | "short_description"
  | "logo_path"
  | "public_email"
  | "public_phone"
  | "website_url"
  | "instagram_url"
  | "facebook_url"
>;

type PublicLocationQueryRow = Pick<
  LocationRow,
  | "id"
  | "name"
  | "slug"
  | "address_line1"
  | "address_line2"
  | "postal_code"
  | "city"
  | "country_code"
  | "sort_order"
  | "public_description"
  | "amenities"
  | "accessibility_notes"
>;

function mapCenterSettings(row: CenterSettingsRow): CenterSettings {
  return {
    businessName: row.business_name,
    timezone: row.timezone,
    defaultLocale: row.default_locale,
    defaultCurrency: row.default_currency,
    bookingEnabled: row.booking_enabled,
    defaultVisitBufferMinutes: row.default_visit_buffer_minutes,
    slotStepMinutes: row.slot_step_minutes,
    holdMinutes: row.hold_minutes,
    minBookingLeadMinutes: row.min_booking_lead_minutes,
    maxBookingHorizonDays: row.max_booking_horizon_days,
    cancellationWindowHours: row.cancellation_window_hours,
    rescheduleWindowHours: row.reschedule_window_hours,
    maxSelfReschedules: row.max_self_reschedules,
    paymentDueHours: row.payment_due_hours,
    centrePaymentLinkHours: row.centre_payment_link_hours,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCenterPublicProfile(
  row: CenterPublicProfileRow,
): CenterPublicProfile {
  return {
    displayName: row.display_name,
    shortDescription: row.short_description,
    logoPath: row.logo_path,
    publicEmail: row.public_email,
    publicPhone: row.public_phone,
    websiteUrl: row.website_url,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicCenterProfile(
  row: PublicCenterProfileQueryRow,
): PublicCenterProfile {
  return {
    displayName: row.display_name,
    shortDescription: row.short_description,
    logoPath: row.logo_path,
    publicEmail: row.public_email,
    publicPhone: row.public_phone,
    websiteUrl: row.website_url,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
  };
}

function mapLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    postalCode: row.postal_code,
    city: row.city,
    countryCode: row.country_code,
    active: row.active,
    publiclyVisible: row.publicly_visible,
    sortOrder: row.sort_order,
    publicDescription: row.public_description,
    amenities: row.amenities,
    accessibilityNotes: row.accessibility_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicLocation(row: PublicLocationQueryRow): PublicLocation {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    postalCode: row.postal_code,
    city: row.city,
    countryCode: row.country_code,
    sortOrder: row.sort_order,
    publicDescription: row.public_description,
    amenities: row.amenities,
    accessibilityNotes: row.accessibility_notes,
  };
}

export async function getCenterSettings(
  client: SupabaseClient<Database>,
): Promise<CenterSettings> {
  const { data, error } = await client
    .from("center_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return mapCenterSettings(data);
}

export async function updateCenterSettings(
  client: SupabaseClient<Database>,
  input: CenterSettingsUpdate,
): Promise<CenterSettings> {
  const patch = centerSettingsUpdateSchema.parse(input);
  const { data, error } = await client
    .from("center_settings")
    .update({
      business_name: patch.businessName,
      timezone: patch.timezone,
      default_locale: patch.defaultLocale,
      default_currency: patch.defaultCurrency,
      booking_enabled: patch.bookingEnabled,
      default_visit_buffer_minutes: patch.defaultVisitBufferMinutes,
      min_booking_lead_minutes: patch.minBookingLeadMinutes,
      max_booking_horizon_days: patch.maxBookingHorizonDays,
      cancellation_window_hours: patch.cancellationWindowHours,
      slot_step_minutes: patch.slotStepMinutes,
      hold_minutes: patch.holdMinutes,
      reschedule_window_hours: patch.rescheduleWindowHours,
      max_self_reschedules: patch.maxSelfReschedules,
      payment_due_hours: patch.paymentDueHours,
      centre_payment_link_hours: patch.centrePaymentLinkHours,
      phone: patch.phone,
      email: patch.email,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) throw error;
  return mapCenterSettings(data);
}

export async function getCenterPublicProfile(
  client: SupabaseClient<Database>,
): Promise<CenterPublicProfile | null> {
  const { data, error } = await client
    .from("center_public_profile")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCenterPublicProfile(data) : null;
}

export async function updateCenterPublicProfile(
  client: SupabaseClient<Database>,
  input: CenterPublicProfileUpdate,
): Promise<CenterPublicProfile> {
  const patch = centerPublicProfileUpdateSchema.parse(input);
  const { data, error } = await client
    .from("center_public_profile")
    .update({
      display_name: patch.displayName,
      short_description: patch.shortDescription,
      logo_path: patch.logoPath,
      public_email: patch.publicEmail,
      public_phone: patch.publicPhone,
      website_url: patch.websiteUrl,
      instagram_url: patch.instagramUrl,
      facebook_url: patch.facebookUrl,
      published: patch.published,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) throw error;
  return mapCenterPublicProfile(data);
}

const publicCenterProfileSelection = `
  display_name,
  short_description,
  logo_path,
  public_email,
  public_phone,
  website_url,
  instagram_url,
  facebook_url
`;

export async function getPublicCenterProfile(
  client: SupabaseClient<Database>,
): Promise<PublicCenterProfile | null> {
  const { data, error } = await client
    .from("center_public_profile")
    .select(publicCenterProfileSelection)
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  return data
    ? mapPublicCenterProfile(data as PublicCenterProfileQueryRow)
    : null;
}

export async function listLocations(
  client: SupabaseClient<Database>,
): Promise<Location[]> {
  const { data, error } = await client
    .from("locations")
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return data.map(mapLocation);
}

export async function getLocationById(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Location | null> {
  const { data, error } = await client
    .from("locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapLocation(data) : null;
}

export async function createLocation(
  client: SupabaseClient<Database>,
  input: LocationCreate,
): Promise<Location> {
  const location = locationCreateSchema.parse(input);
  const { data, error } = await client
    .from("locations")
    .insert({
      name: location.name,
      slug: location.slug,
      address_line1: location.addressLine1,
      address_line2: location.addressLine2,
      postal_code: location.postalCode,
      city: location.city,
      country_code: location.countryCode,
      active: location.active,
      publicly_visible: location.publiclyVisible,
      sort_order: location.sortOrder,
      public_description: location.publicDescription,
      amenities: location.amenities,
      accessibility_notes: location.accessibilityNotes,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapLocation(data);
}

export async function updateLocation(
  client: SupabaseClient<Database>,
  id: string,
  input: LocationUpdate,
): Promise<Location> {
  const patch = locationUpdateSchema.parse(input);
  const { data, error } = await client
    .from("locations")
    .update({
      name: patch.name,
      slug: patch.slug,
      address_line1: patch.addressLine1,
      address_line2: patch.addressLine2,
      postal_code: patch.postalCode,
      city: patch.city,
      country_code: patch.countryCode,
      active: patch.active,
      publicly_visible: patch.publiclyVisible,
      sort_order: patch.sortOrder,
      public_description: patch.publicDescription,
      amenities: patch.amenities,
      accessibility_notes: patch.accessibilityNotes,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapLocation(data);
}

export async function disableLocation(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Location> {
  return updateLocation(client, id, { active: false });
}

const publicLocationSelection = `
  id,
  name,
  slug,
  address_line1,
  address_line2,
  postal_code,
  city,
  country_code,
  sort_order,
  public_description,
  amenities,
  accessibility_notes
`;

export async function listPublicLocations(
  client: SupabaseClient<Database>,
): Promise<PublicLocation[]> {
  const { data, error } = await client
    .from("locations")
    .select(publicLocationSelection)
    .order("sort_order");

  if (error) throw error;
  return (data as PublicLocationQueryRow[]).map(mapPublicLocation);
}

export const centerMappers = {
  centerSettings: mapCenterSettings,
  centerPublicProfile: mapCenterPublicProfile,
  publicCenterProfile: mapPublicCenterProfile,
  location: mapLocation,
  publicLocation: mapPublicLocation,
};
