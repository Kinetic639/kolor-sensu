import { partialUpdateSchema } from "@repo/contracts/partial-update";
import { z } from "zod";

const ianaTimezones = new Set(Intl.supportedValuesOf("timeZone"));

export const timezoneSchema = z
  .string()
  .refine((value) => ianaTimezones.has(value), "Use a valid IANA timezone.");

export const localeSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a BCP 47 locale like pl-PL.");

export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO 4217 currency code.");

export const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO 3166-1 country code.");

export const locationSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL safe.");

export const centerSettingsUpdateSchema = z
  .object({
    businessName: z.string().trim().min(1).max(200),
    timezone: timezoneSchema,
    defaultLocale: localeSchema,
    defaultCurrency: currencyCodeSchema,
    bookingEnabled: z.boolean(),
    defaultVisitBufferMinutes: z.number().int().min(0).max(240),
    minBookingLeadMinutes: z.number().int().min(0).max(10_080),
    maxBookingHorizonDays: z.number().int().min(1).max(730),
    cancellationWindowHours: z.number().int().min(0).max(720),
    slotStepMinutes: z.union([
      z.literal(15),
      z.literal(20),
      z.literal(30),
      z.literal(60),
    ]),
    holdMinutes: z.number().int().min(5).max(30),
    rescheduleWindowHours: z.number().int().min(0).max(720),
    maxSelfReschedules: z.number().int().min(0).max(5),
    paymentDueHours: z.number().int().min(1).max(720),
    centrePaymentLinkHours: z.number().int().min(1).max(72),
    phone: z.string().trim().max(40).nullable(),
    email: z.email().max(320).nullable(),
    legalName: z.string().trim().min(1).max(200).nullable(),
    taxId: z
      .string()
      .regex(/^\d{10}$/)
      .nullable(),
    regon: z
      .string()
      .regex(/^(\d{9}|\d{14})$/)
      .nullable(),
    registeredAddress: z.string().trim().min(1).max(300).nullable(),
    visitReminderHours: z.number().int().min(1).max(168).nullable(),
    paymentReminderHours: z.number().int().min(7).max(168).nullable(),
  })
  .partial();

export const centerPublicProfileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(200),
    shortDescription: z.string().trim().max(500).nullable(),
    logoPath: z.string().max(2048).nullable(),
    publicEmail: z.email().max(320).nullable(),
    publicPhone: z.string().trim().max(40).nullable(),
    websiteUrl: z.url().max(2048).nullable(),
    instagramUrl: z.url().max(2048).nullable(),
    facebookUrl: z.url().max(2048).nullable(),
    published: z.boolean(),
  })
  .partial();

export const locationCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: locationSlugSchema,
  addressLine1: z.string().trim().max(200).nullable().default(null),
  addressLine2: z.string().trim().max(200).nullable().default(null),
  postalCode: z.string().trim().max(20).nullable().default(null),
  city: z.string().trim().max(100).nullable().default(null),
  countryCode: countryCodeSchema.default("PL"),
  active: z.boolean().default(true),
  publiclyVisible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  // Shown on the site above the location's rooms.
  publicDescription: z.string().trim().max(1000).nullable().default(null),
  amenities: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  accessibilityNotes: z.string().trim().max(1000).nullable().default(null),
});

export const locationUpdateSchema = partialUpdateSchema(locationCreateSchema);

export type CenterSettingsUpdate = z.infer<typeof centerSettingsUpdateSchema>;
export type CenterPublicProfileUpdate = z.infer<
  typeof centerPublicProfileUpdateSchema
>;
export type LocationCreate = z.infer<typeof locationCreateSchema>;
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

export interface CenterSettings {
  businessName: string;
  timezone: string;
  defaultLocale: string;
  defaultCurrency: string;
  bookingEnabled: boolean;
  defaultVisitBufferMinutes: number;
  /** Visits start every so many minutes from local midnight. */
  slotStepMinutes: number;
  /** How long a chosen time is held while the client books it. */
  holdMinutes: number;
  minBookingLeadMinutes: number;
  maxBookingHorizonDays: number;
  /** A full refund when cancelled at least this long before the visit. */
  cancellationWindowHours: number;
  /** A client may move their visit themselves this long before it… */
  rescheduleWindowHours: number;
  /** …this many times (0: only through the centre). */
  maxSelfReschedules: number;
  /** A reservation is paid online by this long before the visit (R11)… */
  paymentDueHours: number;
  /** …or, booked by the centre closer than that, within this long. */
  centrePaymentLinkHours: number;
  phone: string | null;
  email: string | null;
  /** The company (`@repo/contracts/company`): digits only. */
  legalName: string | null;
  taxId: string | null;
  regon: string | null;
  registeredAddress: string | null;
  /** The visit's reminder goes out so long before it (none: off). */
  visitReminderHours: number | null;
  /** …and the reminder to pay, so long before the payment is due. */
  paymentReminderHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CenterPublicProfile {
  displayName: string;
  shortDescription: string | null;
  logoPath: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCenterProfile {
  displayName: string;
  shortDescription: string | null;
  logoPath: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
}

export interface Location {
  id: string;
  name: string;
  slug: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
  active: boolean;
  publiclyVisible: boolean;
  sortOrder: number;
  publicDescription: string | null;
  amenities: string[];
  accessibilityNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicLocation {
  id: string;
  name: string;
  slug: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
  sortOrder: number;
  publicDescription: string | null;
  amenities: string[];
  accessibilityNotes: string | null;
}
