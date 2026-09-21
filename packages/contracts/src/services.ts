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

export const serviceUpdateSchema = serviceCreateSchema.partial();

export const specialistServiceUpsertSchema = z
  .object({
    serviceId: z.uuid(),
    priceMinor: priceMinorSchema,
    currencyCode: currencyCodeSchema.default("PLN"),
    durationMinutes: durationMinutesSchema.nullable().default(null),
    supportsInPerson: z.boolean().default(true),
    supportsOnline: z.boolean().default(false),
    active: z.boolean().default(true),
    acceptingNewClients: z.boolean().default(false),
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
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistService {
  id: string;
  specialistId: string;
  serviceId: string;
  active: boolean;
  acceptingNewClients: boolean;
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

export interface PublicSpecialistOffer {
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  specialistPublicSlug: string;
  specialistDisplayName: string;
  /** Raw private-bucket storage path, not a resolvable URL -- sign with createSpecialistMediaSignedUrl. */
  specialistProfilePhotoUrl: string | null;
  specialistProfessionalTitle: string | null;
  priceMinor: number;
  currencyCode: string;
  effectiveDurationMinutes: number;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  acceptingNewClients: boolean;
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

export interface PublicOfferSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  defaultDurationMinutes: number;
  specialistCount: number;
  supportsOnline: boolean;
  supportsInPerson: boolean;
  minPriceMinor: number | null;
  minPriceCurrencyCode: string | null;
}

/**
 * Derives what a public /oferta card may safely claim about a service,
 * strictly from its own active public specialist offers -- never invented.
 * A service with zero public offers yields nulls/zeros/false throughout,
 * not a guessed price or modality.
 *
 * specialistCount is simply the offer count, not a deduplicated set: the
 * specialist_services_specialist_service_key UNIQUE constraint guarantees
 * at most one offer per specialist per service, so each offer already
 * represents exactly one distinct specialist.
 */
export function buildPublicOfferSummary(
  service: PublicService,
  offers: PublicSpecialistOffer[],
): PublicOfferSummary {
  const serviceOffers = offers.filter(
    (offer) => offer.serviceId === service.id,
  );
  const cheapestOffer = serviceOffers.reduce<PublicSpecialistOffer | null>(
    (lowest, offer) =>
      lowest === null || offer.priceMinor < lowest.priceMinor ? offer : lowest,
    null,
  );

  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    shortDescription: service.shortDescription,
    defaultDurationMinutes: service.defaultDurationMinutes,
    specialistCount: serviceOffers.length,
    supportsOnline: serviceOffers.some((offer) => offer.supportsOnline),
    supportsInPerson: serviceOffers.some((offer) => offer.supportsInPerson),
    minPriceMinor: cheapestOffer?.priceMinor ?? null,
    minPriceCurrencyCode: cheapestOffer?.currencyCode ?? null,
  };
}

/** Formats an integer minor-unit amount as a localized currency string. */
export function formatPriceMinor(
  priceMinor: number,
  currencyCode: string,
): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
  }).format(priceMinor / 100);
}

export function formatSpecialistCountLabel(count: number): string {
  return count === 1 ? "1 specjalista" : `${count} specjalistów`;
}
