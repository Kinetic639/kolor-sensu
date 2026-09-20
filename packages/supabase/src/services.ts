import {
  resolveEffectiveDurationMinutes,
  serviceCreateSchema,
  serviceUpdateSchema,
  specialistServiceUpsertSchema,
  type PublicService,
  type PublicSpecialistOffer,
  type Service,
  type ServiceCreate,
  type ServiceUpdate,
  type SpecialistService,
  type SpecialistServiceUpsert,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMySpecialist } from "./specialists";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type SpecialistServiceRow =
  Database["public"]["Tables"]["specialist_services"]["Row"];

export interface AdminServiceSummary extends Service {
  specialistOfferCount: number;
}

export interface AdminServiceOfferSummary extends SpecialistService {
  specialistName: string;
  specialistPublicSlug: string;
  specialistProfessionalTitle: string | null;
}

type PublicServiceQueryRow = Pick<
  ServiceRow,
  | "id"
  | "name"
  | "slug"
  | "short_description"
  | "description"
  | "category"
  | "default_duration_minutes"
>;

type PublicSpecialistOfferQueryRow = {
  service_id: string;
  price_minor: number;
  currency_code: string;
  duration_minutes: number | null;
  supports_in_person: boolean;
  supports_online: boolean;
  accepting_new_clients: boolean;
  specialists: {
    public_slug: string;
    professional_title: string | null;
  };
  services: {
    default_duration_minutes: number;
  };
};

function mapService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category,
    defaultDurationMinutes: row.default_duration_minutes,
    active: row.active,
    publiclyVisible: row.publicly_visible,
    bookingEnabled: row.booking_enabled,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicService(row: PublicServiceQueryRow): PublicService {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category,
    defaultDurationMinutes: row.default_duration_minutes,
  };
}

function mapSpecialistService(row: SpecialistServiceRow): SpecialistService {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    serviceId: row.service_id,
    active: row.active,
    acceptingNewClients: row.accepting_new_clients,
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    durationMinutes: row.duration_minutes,
    supportsInPerson: row.supports_in_person,
    supportsOnline: row.supports_online,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicSpecialistOffer(
  row: PublicSpecialistOfferQueryRow,
): PublicSpecialistOffer {
  return {
    serviceId: row.service_id,
    specialistPublicSlug: row.specialists.public_slug,
    specialistProfessionalTitle: row.specialists.professional_title,
    priceMinor: row.price_minor,
    currencyCode: row.currency_code,
    effectiveDurationMinutes: resolveEffectiveDurationMinutes(
      { defaultDurationMinutes: row.services.default_duration_minutes },
      { durationMinutes: row.duration_minutes },
    ),
    supportsInPerson: row.supports_in_person,
    supportsOnline: row.supports_online,
    acceptingNewClients: row.accepting_new_clients,
  };
}

export async function listServicesAdmin(
  client: SupabaseClient<Database>,
): Promise<Service[]> {
  const { data, error } = await client
    .from("services")
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return data.map(mapService);
}

export async function listServiceSummariesAdmin(
  client: SupabaseClient<Database>,
): Promise<AdminServiceSummary[]> {
  const { data, error } = await client
    .from("services")
    .select("*, specialist_services(id)")
    .order("sort_order");

  if (error) throw error;
  return (
    data as unknown as Array<
      ServiceRow & { specialist_services: { id: string }[] }
    >
  ).map((row) => ({
    ...mapService(row),
    specialistOfferCount: row.specialist_services.length,
  }));
}

export async function getServiceByIdAdmin(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Service | null> {
  const { data, error } = await client
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapService(data) : null;
}

export async function createService(
  client: SupabaseClient<Database>,
  input: ServiceCreate,
): Promise<Service> {
  const service = serviceCreateSchema.parse(input);
  const { data, error } = await client
    .from("services")
    .insert({
      name: service.name,
      slug: service.slug,
      short_description: service.shortDescription,
      description: service.description,
      category: service.category,
      default_duration_minutes: service.defaultDurationMinutes,
      active: service.active,
      publicly_visible: service.publiclyVisible,
      booking_enabled: service.bookingEnabled,
      sort_order: service.sortOrder,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapService(data);
}

export async function updateService(
  client: SupabaseClient<Database>,
  id: string,
  input: ServiceUpdate,
): Promise<Service> {
  const patch = serviceUpdateSchema.parse(input);
  const { data, error } = await client
    .from("services")
    .update({
      name: patch.name,
      slug: patch.slug,
      short_description: patch.shortDescription,
      description: patch.description,
      category: patch.category,
      default_duration_minutes: patch.defaultDurationMinutes,
      active: patch.active,
      publicly_visible: patch.publiclyVisible,
      booking_enabled: patch.bookingEnabled,
      sort_order: patch.sortOrder,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapService(data);
}

export async function disableService(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Service> {
  return updateService(client, id, { active: false });
}

export async function listSpecialistOffersAdmin(
  client: SupabaseClient<Database>,
): Promise<SpecialistService[]> {
  const { data, error } = await client
    .from("specialist_services")
    .select("*")
    .order("created_at");

  if (error) throw error;
  return data.map(mapSpecialistService);
}

export async function listSpecialistOffersForServiceAdmin(
  client: SupabaseClient<Database>,
  serviceId: string,
): Promise<AdminServiceOfferSummary[]> {
  const { data, error } = await client
    .from("specialist_services")
    .select(
      `
        *,
        specialists!inner (
          public_slug,
          professional_title,
          specialist_public_profiles (display_name)
        )
      `,
    )
    .eq("service_id", serviceId)
    .order("created_at");

  if (error) throw error;
  return (
    data as unknown as Array<
      SpecialistServiceRow & {
        specialists: {
          public_slug: string;
          professional_title: string | null;
          specialist_public_profiles: { display_name: string } | null;
        };
      }
    >
  ).map((row) => ({
    ...mapSpecialistService(row),
    specialistName:
      row.specialists.specialist_public_profiles?.display_name ??
      row.specialists.public_slug,
    specialistPublicSlug: row.specialists.public_slug,
    specialistProfessionalTitle: row.specialists.professional_title,
  }));
}

export async function listAvailableServicesForSpecialist(
  client: SupabaseClient<Database>,
): Promise<Service[]> {
  const { data, error } = await client
    .from("services")
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return data.map(mapService);
}

export async function listMySpecialistServices(
  client: SupabaseClient<Database>,
  specialistId?: string,
): Promise<SpecialistService[]> {
  let currentSpecialistId = specialistId;
  if (!currentSpecialistId) {
    const specialist = await getMySpecialist(client);
    currentSpecialistId = specialist?.id;
  }
  if (!currentSpecialistId) return [];

  const { data, error } = await client
    .from("specialist_services")
    .select("*")
    .eq("specialist_id", currentSpecialistId)
    .order("created_at");

  if (error) throw error;
  return data.map(mapSpecialistService);
}

export async function upsertMySpecialistService(
  client: SupabaseClient<Database>,
  input: SpecialistServiceUpsert,
): Promise<SpecialistService> {
  const offer = specialistServiceUpsertSchema.parse(input);
  const specialist = await getMySpecialist(client);
  if (!specialist) {
    throw new Error("Specialist record not found");
  }

  const { data, error } = await client
    .from("specialist_services")
    .upsert(
      {
        specialist_id: specialist.id,
        service_id: offer.serviceId,
        price_minor: offer.priceMinor,
        currency_code: offer.currencyCode,
        duration_minutes: offer.durationMinutes,
        supports_in_person: offer.supportsInPerson,
        supports_online: offer.supportsOnline,
        active: offer.active,
        accepting_new_clients: offer.acceptingNewClients,
      },
      { onConflict: "specialist_id,service_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return mapSpecialistService(data);
}

export async function disableMySpecialistService(
  client: SupabaseClient<Database>,
  id: string,
): Promise<SpecialistService> {
  const { data, error } = await client
    .from("specialist_services")
    .update({ active: false })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapSpecialistService(data);
}

const publicServiceSelection = `
  id,
  name,
  slug,
  short_description,
  description,
  category,
  default_duration_minutes
`;

export async function listPublicServices(
  client: SupabaseClient<Database>,
): Promise<PublicService[]> {
  const { data, error } = await client
    .from("services")
    .select(publicServiceSelection)
    .order("sort_order");

  if (error) throw error;
  return (data as PublicServiceQueryRow[]).map(mapPublicService);
}

export async function getPublicServiceBySlug(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<PublicService | null> {
  const { data, error } = await client
    .from("services")
    .select(publicServiceSelection)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPublicService(data as PublicServiceQueryRow) : null;
}

const publicSpecialistOfferSelection = `
  service_id,
  price_minor,
  currency_code,
  duration_minutes,
  supports_in_person,
  supports_online,
  accepting_new_clients,
  specialists!inner (
    public_slug,
    professional_title
  ),
  services!inner (
    slug,
    default_duration_minutes
  )
`;

export async function listPublicSpecialistOffersForService(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<PublicSpecialistOffer[]> {
  const { data, error } = await client
    .from("specialist_services")
    .select(publicSpecialistOfferSelection)
    .eq("active", true)
    .eq("services.slug", slug);

  if (error) throw error;
  return (data as unknown as PublicSpecialistOfferQueryRow[]).map(
    mapPublicSpecialistOffer,
  );
}

export const serviceMappers = {
  service: mapService,
  publicService: mapPublicService,
  specialistService: mapSpecialistService,
  publicSpecialistOffer: mapPublicSpecialistOffer,
};
