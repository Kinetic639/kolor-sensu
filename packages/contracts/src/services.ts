import { partialUpdateSchema } from "@repo/contracts/partial-update";
import { z } from "zod";
import { currencyCodeSchema } from "@repo/contracts/center";

export const serviceCategorySchema = z.enum([
  "consultation",
  "psychotherapy",
  "couples_therapy",
  "assessment",
  "workshop_related",
  "other",
]);

export const serviceSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL safe.");

export const durationMinutesSchema = z.number().int().min(15).max(300);

export const priceMinorSchema = z.number().int().min(0).max(10_000_000);

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: serviceSlugSchema,
  shortDescription: z.string().trim().max(500).nullable().default(null),
  description: z.string().trim().max(10_000).nullable().default(null),
  category: serviceCategorySchema.default("other"),
  defaultDurationMinutes: durationMinutesSchema,
  active: z.boolean().default(true),
  publiclyVisible: z.boolean().default(true),
  bookingEnabled: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const serviceUpdateSchema = partialUpdateSchema(serviceCreateSchema);

export const serviceCatalogNameSchema = z.string().trim().min(1).max(120);

/**
 * The offer as the admin arranges it, in order: the catalogues (a new one
 * without an id), and every service with its catalogue (by the catalogue's
 * key; none: outside one). Catalogues not listed are removed.
 */
export const serviceArrangementSchema = z.object({
  catalogs: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        id: z.uuid().nullable(),
        name: serviceCatalogNameSchema,
      }),
    )
    .max(50),
  /** Loose services and catalogues share one order: their keys, in it. */
  order: z.array(z.string().min(1).max(64)).max(250),
  services: z
    .array(
      z.object({
        id: z.uuid(),
        catalogKey: z.string().min(1).max(64).nullable(),
      }),
    )
    .max(200),
});
export type ServiceArrangement = z.infer<typeof serviceArrangementSchema>;

export const specialistServiceUpsertSchema = z
  .object({
    serviceId: z.uuid(),
    priceMinor: priceMinorSchema,
    currencyCode: currencyCodeSchema.default("PLN"),
    durationMinutes: durationMinutesSchema.nullable().default(null),
    supportsInPerson: z.boolean().default(true),
    supportsOnline: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => !data.active || data.supportsInPerson || data.supportsOnline,
    {
      message: "An active offering must support at least one modality.",
      path: ["supportsInPerson"],
    },
  );

export type ServiceCategory = z.infer<typeof serviceCategorySchema>;
export type ServiceCreate = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdate = z.infer<typeof serviceUpdateSchema>;
export type SpecialistServiceUpsert = z.infer<
  typeof specialistServiceUpsertSchema
>;

export interface Service {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: ServiceCategory;
  defaultDurationMinutes: number;
  active: boolean;
  publiclyVisible: boolean;
  bookingEnabled: boolean;
  /** Its place: in its catalogue, or (none) among the catalogues. */
  sortOrder: number;
  catalogId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistService {
  id: string;
  specialistId: string;
  serviceId: string;
  active: boolean;
  priceMinor: number;
  currencyCode: string;
  durationMinutes: number | null;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicService {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: ServiceCategory;
  defaultDurationMinutes: number;
}

/** A service in the site's offer: with its place and catalogue. */
export interface PublicOfferService extends PublicService {
  sortOrder: number;
  catalogId: string | null;
}

export interface PublicSpecialistOffer {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  specialistPublicSlug: string;
  specialistProfessionalTitle: string | null;
  priceMinor: number;
  currencyCode: string;
  effectiveDurationMinutes: number;
  supportsInPerson: boolean;
  supportsOnline: boolean;
}

/**
 * The single reusable implementation of the duration-fallback rule: an
 * explicit specialist override always wins, otherwise the service default
 * applies.
 */
export function resolveEffectiveDurationMinutes(
  service: Pick<Service, "defaultDurationMinutes">,
  specialistService: Pick<SpecialistService, "durationMinutes">,
): number {
  return specialistService.durationMinutes ?? service.defaultDurationMinutes;
}
