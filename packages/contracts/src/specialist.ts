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

const optionalMediaPathSchema = z
  .string()
  .max(2048)
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/.+/i,
    "Media path must start with the specialist ID.",
  )
  .nullable();

const profileFields = {
  displayName: z.string().trim().max(160),
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
} as const;

export const specialistPublicProfileInputSchema = z.object(profileFields);
export const specialistProfileDraftInputSchema = z.object(profileFields);

/**
 * A draft may be saved half-filled; sending it for review needs everything the
 * public profile page shows.
 */
export const specialistProfileSubmissionSchema = z.object({
  ...profileFields,
  displayName: profileFields.displayName.min(1, "Podaj imię i nazwisko."),
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
  acceptingNewClients: boolean;
  publicSlug: string;
  professionalTitle: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistPublicProfile {
  specialistId: string;
  publicSlug: string;
  active: boolean;
  acceptingNewClients: boolean;
  professionalTitle: string | null;
  joinedAt: string | null;
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
  publicationStatus: ProfilePublicationStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistProfileDraft {
  id: string;
  specialistId: string;
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
  status: ProfilePublicationStatus;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
}
