import type {
  CenterPublicProfile,
  CenterPublicProfileUpdate,
  Location,
  LocationCreate,
} from "@repo/contracts";
import { z } from "zod";

/** "Gabinet Mokotów" → "gabinet-mokotow" (Polish letters folded to ASCII). */
export function slugify(value: string): string {
  return value
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    active: values.active,
    publiclyVisible: values.publiclyVisible,
  };
}
