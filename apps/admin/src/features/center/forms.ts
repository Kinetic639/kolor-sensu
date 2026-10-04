import type {
  CenterPublicProfile,
  CenterPublicProfileUpdate,
  CenterSettings,
  CenterSettingsUpdate,
  Location,
  LocationCreate,
} from "@repo/contracts";
import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max);
const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => !value || z.email().safeParse(value).success,
    "Podaj poprawny adres e-mail.",
  );
const optionalUrl = z
  .string()
  .trim()
  .refine(
    (value) => !value || z.url().safeParse(value).success,
    "Podaj pełny adres, np. https://…",
  );
const nullIfEmpty = (value: string) => value.trim() || null;

export const centerProfileFormSchema = z.object({
  displayName: z.string().trim().min(1, "Podaj nazwę centrum.").max(200),
  shortDescription: optionalText(500),
  publicPhone: optionalText(40),
  publicEmail: optionalEmail,
  websiteUrl: optionalUrl,
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  published: z.boolean(),
});

export type CenterProfileFormValues = z.infer<typeof centerProfileFormSchema>;

export function toCenterProfileFormValues(
  profile: CenterPublicProfile | null,
): CenterProfileFormValues {
  return {
    displayName: profile?.displayName ?? "Kolor Sensu",
    shortDescription: profile?.shortDescription ?? "",
    publicPhone: profile?.publicPhone ?? "",
    publicEmail: profile?.publicEmail ?? "",
    websiteUrl: profile?.websiteUrl ?? "",
    instagramUrl: profile?.instagramUrl ?? "",
    facebookUrl: profile?.facebookUrl ?? "",
    published: profile?.published ?? false,
  };
}

export function toCenterProfileUpdate(
  values: CenterProfileFormValues,
): CenterPublicProfileUpdate {
  return {
    displayName: values.displayName.trim(),
    shortDescription: nullIfEmpty(values.shortDescription),
    publicPhone: nullIfEmpty(values.publicPhone),
    publicEmail: nullIfEmpty(values.publicEmail),
    websiteUrl: nullIfEmpty(values.websiteUrl),
    instagramUrl: nullIfEmpty(values.instagramUrl),
    facebookUrl: nullIfEmpty(values.facebookUrl),
    published: values.published,
  };
}

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę lokalizacji.").max(200),
  slug: z
    .string()
    .min(3, "Adres (slug) musi mieć co najmniej 3 znaki.")
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Używaj małych liter, cyfr i myślników.",
    ),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  postalCode: optionalText(20),
  city: optionalText(100),
  publicDescription: optionalText(1000),
  amenities: z.array(z.string().trim().min(1).max(100)).max(30),
  accessibilityNotes: optionalText(1000),
  active: z.boolean(),
  publiclyVisible: z.boolean(),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;

export function toLocationFormValues(
  location: Location | null,
): LocationFormValues {
  return {
    name: location?.name ?? "",
    slug: location?.slug ?? "",
    addressLine1: location?.addressLine1 ?? "",
    addressLine2: location?.addressLine2 ?? "",
    postalCode: location?.postalCode ?? "",
    city: location?.city ?? "",
    publicDescription: location?.publicDescription ?? "",
    amenities: location?.amenities ?? [],
    accessibilityNotes: location?.accessibilityNotes ?? "",
    active: location?.active ?? true,
    publiclyVisible: location?.publiclyVisible ?? true,
  };
}

export function toLocationInput(
  values: LocationFormValues,
): Omit<LocationCreate, "countryCode" | "sortOrder"> {
  return {
    name: values.name.trim(),
    slug: values.slug,
    addressLine1: nullIfEmpty(values.addressLine1),
    addressLine2: nullIfEmpty(values.addressLine2),
    postalCode: nullIfEmpty(values.postalCode),
    city: nullIfEmpty(values.city),
    publicDescription: nullIfEmpty(values.publicDescription),
    amenities: values.amenities,
    accessibilityNotes: nullIfEmpty(values.accessibilityNotes),
    active: values.active,
    publiclyVisible: values.publiclyVisible,
  };
}

// Online booking: the grid, notice, horizon and hold, and the rules for
// changing a booked visit. The notice is shown in hours, kept in minutes.

const whole = (min: number, max: number, message: string) =>
  z.number({ error: message }).int(message).min(min, message).max(max, message);

export const SLOT_STEPS = ["15", "20", "30", "60"] as const;

/** When the visit's reminder goes out: hours before it, or not at all. */
export const VISIT_REMINDERS = ["off", "2", "12", "24", "48", "72"] as const;

export const bookingSettingsFormSchema = z.object({
  bookingEnabled: z.boolean(),
  slotStepMinutes: z.enum(SLOT_STEPS, { error: "Wybierz siatkę godzin." }),
  defaultVisitBufferMinutes: whole(0, 240, "Podaj od 0 do 240 minut."),
  minBookingLeadHours: whole(0, 168, "Podaj od 0 do 168 godzin."),
  maxBookingHorizonDays: whole(1, 730, "Podaj od 1 do 730 dni."),
  holdMinutes: whole(5, 30, "Blokada terminu trwa od 5 do 30 minut."),
  cancellationWindowHours: whole(0, 720, "Podaj od 0 do 720 godzin."),
  rescheduleWindowHours: whole(0, 720, "Podaj od 0 do 720 godzin."),
  maxSelfReschedules: whole(0, 5, "Podaj od 0 do 5."),
  paymentDueHours: whole(1, 720, "Podaj od 1 do 720 godzin."),
  centrePaymentLinkHours: whole(1, 72, "Podaj od 1 do 72 godzin."),
  visitReminder: z.enum(VISIT_REMINDERS, {
    error: "Wybierz, kiedy wysłać przypomnienie.",
  }),
});

export type BookingSettingsFormValues = z.infer<
  typeof bookingSettingsFormSchema
>;

export function toBookingSettingsFormValues(
  settings: CenterSettings,
): BookingSettingsFormValues {
  const step = String(settings.slotStepMinutes);
  return {
    bookingEnabled: settings.bookingEnabled,
    slotStepMinutes: (SLOT_STEPS as readonly string[]).includes(step)
      ? (step as BookingSettingsFormValues["slotStepMinutes"])
      : "60",
    defaultVisitBufferMinutes: settings.defaultVisitBufferMinutes,
    minBookingLeadHours: Math.round(settings.minBookingLeadMinutes / 60),
    maxBookingHorizonDays: settings.maxBookingHorizonDays,
    holdMinutes: settings.holdMinutes,
    cancellationWindowHours: settings.cancellationWindowHours,
    rescheduleWindowHours: settings.rescheduleWindowHours,
    maxSelfReschedules: settings.maxSelfReschedules,
    paymentDueHours: settings.paymentDueHours,
    centrePaymentLinkHours: settings.centrePaymentLinkHours,
    visitReminder:
      settings.visitReminderHours === null
        ? "off"
        : (((VISIT_REMINDERS as readonly string[]).includes(
            String(settings.visitReminderHours),
          )
            ? String(settings.visitReminderHours)
            : "24") as BookingSettingsFormValues["visitReminder"]),
  };
}

export function toBookingSettingsUpdate(
  values: BookingSettingsFormValues,
): CenterSettingsUpdate {
  return {
    bookingEnabled: values.bookingEnabled,
    slotStepMinutes: Number(values.slotStepMinutes) as 15 | 20 | 30 | 60,
    defaultVisitBufferMinutes: values.defaultVisitBufferMinutes,
    minBookingLeadMinutes: values.minBookingLeadHours * 60,
    maxBookingHorizonDays: values.maxBookingHorizonDays,
    holdMinutes: values.holdMinutes,
    cancellationWindowHours: values.cancellationWindowHours,
    rescheduleWindowHours: values.rescheduleWindowHours,
    maxSelfReschedules: values.maxSelfReschedules,
    paymentDueHours: values.paymentDueHours,
    centrePaymentLinkHours: values.centrePaymentLinkHours,
    visitReminderHours:
      values.visitReminder === "off" ? null : Number(values.visitReminder),
  };
}
