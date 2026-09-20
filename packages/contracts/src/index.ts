import { z } from "zod";

export {
  profilePublicationStatusSchema,
  specialistImageMetadataSchema,
  specialistProfileDraftInputSchema,
  specialistProfileReviewInputSchema,
  specialistPublicProfileInputSchema,
  specialistSlugSchema,
} from "@repo/contracts/specialist";
export type {
  ProfilePublicationStatus,
  Specialist,
  SpecialistImageMetadata,
  SpecialistProfileDraft,
  SpecialistProfileDraftInput,
  SpecialistProfileReviewInput,
  SpecialistPublicProfile,
  SpecialistPublicProfileInput,
} from "@repo/contracts/specialist";

export const userRoleSchema = z.enum(["admin", "specialist", "client"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export interface Room {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  specialistId: string;
  serviceId: Service["id"];
  startsAt: string;
}
