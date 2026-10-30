import {
  resolveEffectiveDurationMinutes,
  serviceArrangementSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
  specialistServiceUpsertSchema,
  type PublicOfferService,
  type PublicService,
  type PublicSpecialistOffer,
  type Service,
  type ServiceArrangement,
  type ServiceCatalog,
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
  | "sort_order"
  | "catalog_id"
>;

type PublicSpecialistOfferQueryRow = {
  service_id: string;
  price_minor: number;
  currency_code: string;
  duration_minutes: number | null;
  supports_in_person: boolean;
  supports_online: boolean;
  specialists: {
    public_slug: string;
    professional_title: string | null;
  };
  services: {
    name: string;
    slug: string;
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
    afterMinutes: row.after_minutes,
    active: row.active,
    publiclyVisible: row.publicly_visible,
    bookingEnabled: row.booking_enabled,
    requiresIntake: row.requires_intake,
    forMinors: row.for_minors,
    sortOrder: row.sort_order,
    catalogId: row.catalog_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicService(row: PublicServiceQueryRow): PublicOfferService {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category,
    defaultDurationMinutes: row.default_duration_minutes,
    sortOrder: row.sort_order,
    catalogId: row.catalog_id,
  };
}

function mapSpecialistService(row: SpecialistServiceRow): SpecialistService {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    serviceId: row.service_id,
    active: row.active,
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
    serviceName: row.services.name,
    serviceSlug: row.services.slug,
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
      after_minutes: service.afterMinutes,
      active: service.active,
      publicly_visible: service.publiclyVisible,
      booking_enabled: service.bookingEnabled,
      requires_intake: service.requiresIntake,
      for_minors: service.forMinors,
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
      after_minutes: patch.afterMinutes,
      active: patch.active,
      publicly_visible: patch.publiclyVisible,
      booking_enabled: patch.bookingEnabled,
      requires_intake: patch.requiresIntake,
      for_minors: patch.forMinors,
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

export async function listSpecialistOffersForAdmin(
  client: SupabaseClient<Database>,
  specialistId: string,
): Promise<SpecialistService[]> {
  const { data, error } = await client
    .from("specialist_services")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("created_at");

  if (error) throw error;
  return data.map(mapSpecialistService);
}

export async function updateSpecialistOfferStateAdmin(
  client: SupabaseClient<Database>,
  offerId: string,
  state: { active: boolean },
): Promise<SpecialistService> {
  const { data, error } = await client
    .from("specialist_services")
    .update({
      active: state.active,
    })
    .eq("id", offerId)
    .select("*")
    .single();

  if (error) throw error;
  return mapSpecialistService(data);
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
  default_duration_minutes,
  sort_order,
  catalog_id
`;

export async function listPublicServices(
  client: SupabaseClient<Database>,
): Promise<PublicOfferService[]> {
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
  specialists!inner (
    public_slug,
    professional_title
  ),
  services!inner (
    name,
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

/** One specialist's active, public offers, cheapest first (for their profile). */
export async function listPublicOffersForSpecialist(
  client: SupabaseClient<Database>,
  publicSlug: string,
): Promise<PublicSpecialistOffer[]> {
  const { data, error } = await client
    .from("specialist_services")
    .select(publicSpecialistOfferSelection)
    .eq("active", true)
    .eq("specialists.public_slug", publicSlug);

  if (error) throw error;
  return (data as unknown as PublicSpecialistOfferQueryRow[])
    .map(mapPublicSpecialistOffer)
    .sort((a, b) => a.priceMinor - b.priceMinor);
}

export const serviceMappers = {
  service: mapService,
  publicService: mapPublicService,
  specialistService: mapSpecialistService,
  publicSpecialistOffer: mapPublicSpecialistOffer,
};

// ------------------------------------------------------------ catalogues

/** The offer's catalogues (anyone may read their names). */
export async function listServiceCatalogs(
  client: SupabaseClient<Database>,
): Promise<ServiceCatalog[]> {
  const { data, error } = await client
    .from("service_catalogs")
    .select("id, name, sort_order")
    .order("sort_order");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  }));
}

/**
 * The offer arranged as the admin left it: new catalogues made, names
 * kept, every place and catalogue set at once (arrange_services), then the
 * catalogues no longer listed removed (their services are out by then).
 */
export async function saveServiceArrangement(
  client: SupabaseClient<Database>,
  input: ServiceArrangement,
  existing: ServiceCatalog[],
): Promise<void> {
  const arrangement = serviceArrangementSchema.parse(input);
  const ids = new Map<string, string>();
  const made = arrangement.catalogs.filter((catalog) => !catalog.id);
  if (made.length) {
    const { data, error } = await client
      .from("service_catalogs")
      .insert(made.map((catalog) => ({ name: catalog.name })))
      .select("id");
    if (error) throw error;
    made.forEach((catalog, index) => ids.set(catalog.key, data[index]!.id));
  }
  const names = new Map(existing.map((catalog) => [catalog.id, catalog.name]));
  for (const catalog of arrangement.catalogs) {
    if (!catalog.id) continue;
    ids.set(catalog.key, catalog.id);
    if (names.get(catalog.id) !== catalog.name) {
      const { error } = await client
        .from("service_catalogs")
        .update({ name: catalog.name })
        .eq("id", catalog.id);
      if (error) throw error;
    }
  }

  // One order for the loose services and the catalogues, then each
  // catalogue's own: places 1, 2, …
  const place = new Map(
    arrangement.order.map((key, index) => [key, index + 1]),
  );
  const within = new Map<string, number>();
  const { error } = await client.rpc("arrange_services", {
    p_catalogs: arrangement.catalogs.map((catalog) => ({
      id: ids.get(catalog.key)!,
      sort_order: place.get(catalog.key) ?? 0,
    })),
    p_services: arrangement.services.map((service) => {
      if (!service.catalogKey || !ids.has(service.catalogKey)) {
        return {
          id: service.id,
          catalog_id: null,
          sort_order: place.get(service.id) ?? 0,
        };
      }
      const next = (within.get(service.catalogKey) ?? 0) + 1;
      within.set(service.catalogKey, next);
      return {
        id: service.id,
        catalog_id: ids.get(service.catalogKey)!,
        sort_order: next,
      };
    }),
  });
  if (error) throw error;

  const kept = new Set(ids.values());
  const gone = existing.filter((catalog) => !kept.has(catalog.id));
  if (gone.length) {
    const { error: removing } = await client
      .from("service_catalogs")
      .delete()
      .in(
        "id",
        gone.map((catalog) => catalog.id),
      );
    if (removing) throw removing;
  }
}
