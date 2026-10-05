import {
  richTextDocumentWithMaxCharacters,
  type RichTextDocument,
} from "@repo/contracts/rich-text";
import { z } from "zod";

export const profilePublicationStatusSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "rejected",
]);

export const specialistSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL safe.");

/** Who a specialist works with; stored as these codes, labelled in the apps. */
export const clientGroupSchema = z.enum([
  "adults",
  "teens",
  "children",
  "couples",
  "families",
]);

export const CLIENT_GROUP_LABELS: Record<ClientGroup, string> = {
  adults: "Dorośli",
  teens: "Młodzież",
  children: "Dzieci",
  couples: "Pary",
  families: "Rodziny",
};

/** Labels in the fixed order of `clientGroupSchema`, whatever order was saved. */
export function clientGroupLabels(groups: readonly ClientGroup[]): string[] {
  return clientGroupSchema.options
    .filter((group) => groups.includes(group))
    .map((group) => CLIENT_GROUP_LABELS[group]);
}

export interface PersonName {
  firstName: string;
  lastName: string;
}

/** "Anna Nowak": the first and last name, blanks left out. */
export function personName({ firstName, lastName }: PersonName) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** "AN": the first letter of the first and of the last name. */
export function personInitials({ firstName, lastName }: PersonName) {
  return [firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .map((part) => part[0]!.toLocaleUpperCase("pl-PL"))
    .join("");
}

const optionalMediaPathSchema = z
  .string()
  .max(2048)
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/.+/i,
    "Media path must start with the specialist ID.",
  )
  .nullable();

const profileFields = {
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  professionalTitle: z.string().trim().max(160),
  shortBio: z.string().trim().max(500),
  // Rich text (docs/architecture/rich-text-platform.md), 10 000 characters.
  longBio: richTextDocumentWithMaxCharacters(10_000),
  profilePhotoUrl: optionalMediaPathSchema,
  portraitPhotoUrl: optionalMediaPathSchema,
  languages: z.array(z.string().trim().min(1).max(100)).max(20),
  therapyApproaches: z.array(z.string().trim().min(1).max(160)).max(50),
  specializations: z.array(z.string().trim().min(1).max(160)).max(50),
  education: z.array(z.string().trim().min(1).max(500)).max(50),
  certificates: z.array(z.string().trim().min(1).max(500)).max(50),
  modalities: z.array(z.string().trim().min(1).max(160)).max(20),
  clientGroups: z
    .array(clientGroupSchema)
    .refine((groups) => new Set(groups).size === groups.length, {
      message: "Każda grupa może być wybrana tylko raz.",
    }),
} as const;

export const specialistPublicProfileInputSchema = z.object(profileFields);
export const specialistProfileDraftInputSchema = z.object(profileFields);

/**
 * A draft may be saved half-filled; sending it for review needs everything the
 * public profile page shows.
 */
export const specialistProfileSubmissionSchema = z.object({
  ...profileFields,
  firstName: profileFields.firstName.min(1, "Podaj imię."),
  lastName: profileFields.lastName.min(1, "Podaj nazwisko."),
  professionalTitle: profileFields.professionalTitle.min(
    1,
    "Podaj tytuł zawodowy.",
  ),
  shortBio: profileFields.shortBio.min(1, "Dodaj krótki opis."),
  specializations: profileFields.specializations.min(
    1,
    "Dodaj co najmniej jedną specjalizację.",
  ),
  therapyApproaches: profileFields.therapyApproaches.min(
    1,
    "Dodaj co najmniej jeden nurt pracy.",
  ),
  modalities: profileFields.modalities.min(
    1,
    "Wybierz co najmniej jedną formę spotkań.",
  ),
  clientGroups: profileFields.clientGroups.min(1, "Wybierz, z kim pracujesz."),
});

export const specialistProfileReviewInputSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("approve"),
      draftId: z.uuid(),
      comment: z.string().trim().max(2000).nullable().default(null),
    }),
    z.object({
      action: z.literal("reject"),
      draftId: z.uuid(),
      comment: z.string().trim().min(1).max(2000),
    }),
  ],
);

export const specialistImageMetadataSchema = z.object({
  bucket: z.literal("specialist-profile-media"),
  path: z
    .string()
    .max(1024)
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/i,
      "Use a specialist-owned image path.",
    ),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
});

export type ClientGroup = z.infer<typeof clientGroupSchema>;
export type ProfilePublicationStatus = z.infer<
  typeof profilePublicationStatusSchema
>;
export type SpecialistPublicProfileInput = z.infer<
  typeof specialistPublicProfileInputSchema
>;
export type SpecialistProfileDraftInput = z.infer<
  typeof specialistProfileDraftInputSchema
>;
export type SpecialistProfileReviewInput = z.infer<
  typeof specialistProfileReviewInputSchema
>;
export type SpecialistImageMetadata = z.infer<
  typeof specialistImageMetadataSchema
>;

export interface Specialist {
  id: string;
  userId: string;
  active: boolean;
  /** On the site and booked online (the admin hides them for a while). */
  publiclyVisible: boolean;
  publicSlug: string;
  professionalTitle: string | null;
  joinedAt: string | null;
  /** `#rrggbb`, or null for the automatic colour (set by admins). */
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistPublicProfile {
  specialistId: string;
  publicSlug: string;
  active: boolean;
  professionalTitle: string | null;
  joinedAt: string | null;
  firstName: string;
  lastName: string;
  /** The first and last name, as shown on the site. */
  displayName: string;
  shortBio: string;
  longBio: RichTextDocument;
  profilePhotoUrl: string | null;
  portraitPhotoUrl: string | null;
  languages: string[];
  therapyApproaches: string[];
  specializations: string[];
  education: string[];
  certificates: string[];
  modalities: string[];
  clientGroups: ClientGroup[];
  publicationStatus: ProfilePublicationStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistProfileDraft {
  id: string;
  specialistId: string;
  firstName: string;
  lastName: string;
  /** The first and last name, as shown on the site. */
  displayName: string;
  professionalTitle: string | null;
  shortBio: string;
  longBio: RichTextDocument;
  profilePhotoUrl: string | null;
  portraitPhotoUrl: string | null;
  languages: string[];
  therapyApproaches: string[];
  specializations: string[];
  education: string[];
  certificates: string[];
  modalities: string[];
  clientGroups: ClientGroup[];
  status: ProfilePublicationStatus;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
}
