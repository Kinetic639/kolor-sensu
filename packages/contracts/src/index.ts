import { z } from "zod";

export {
  centerPublicProfileUpdateSchema,
  centerSettingsUpdateSchema,
  countryCodeSchema,
  currencyCodeSchema,
  localeSchema,
  locationCreateSchema,
  locationSlugSchema,
  locationUpdateSchema,
  timezoneSchema,
} from "@repo/contracts/center";
export type {
  CenterPublicProfile,
  CenterPublicProfileUpdate,
  CenterSettings,
  CenterSettingsUpdate,
  Location,
  LocationCreate,
  LocationUpdate,
  PublicCenterProfile,
  PublicLocation,
} from "@repo/contracts/center";
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
export {
  durationMinutesSchema,
  priceMinorSchema,
  resolveEffectiveDurationMinutes,
  serviceCategorySchema,
  serviceCreateSchema,
  serviceSlugSchema,
  serviceUpdateSchema,
  specialistServiceUpsertSchema,
} from "@repo/contracts/services";
export type {
  PublicService,
  PublicSpecialistOffer,
  Service,
  ServiceCategory,
  ServiceCreate,
  ServiceUpdate,
  SpecialistService,
  SpecialistServiceUpsert,
} from "@repo/contracts/services";
export { homePageContentSchema } from "@repo/contracts/cms";
export type { HomeContentAdmin, HomePageContent } from "@repo/contracts/cms";

export const userRoleSchema = z.enum(["admin", "specialist", "client"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export interface Room {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  specialistId: string;
  serviceId: string;
  startsAt: string;
}
