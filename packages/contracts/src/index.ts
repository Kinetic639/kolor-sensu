import { z } from "zod";

export {
  availabilityModeSchema,
  availabilityRecurrenceSchema,
  availabilityRuleInputSchema,
  occurrenceScopeSchema,
  recurrenceEndSchema,
  localDateSchema,
  quarterHourSchema,
  timeOffInputSchema,
} from "@repo/contracts/availability";
export type {
  AvailabilityMode,
  AvailabilityRecurrence,
  AvailabilityRuleInput,
  AvailabilityRuleValues,
  OccurrenceScope,
  RecurrenceEnd,
  RoomAvailabilityRule,
  RoomOccupancy,
  SpecialistAvailabilityRule,
  SpecialistTimeOff,
  TimeOffInput,
} from "@repo/contracts/availability";
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
  CLIENT_GROUP_LABELS,
  clientGroupLabels,
  clientGroupSchema,
  personInitials,
  personName,
  profilePublicationStatusSchema,
  specialistImageMetadataSchema,
  specialistProfileDraftInputSchema,
  specialistProfileSubmissionSchema,
  specialistProfileReviewInputSchema,
  specialistPublicProfileInputSchema,
  specialistSlugSchema,
} from "@repo/contracts/specialist";
export type {
  ClientGroup,
  PersonName,
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
  afterMinutesSchema,
  durationMinutesSchema,
  priceMinorSchema,
  resolveEffectiveDurationMinutes,
  serviceArrangementSchema,
  serviceCatalogNameSchema,
  serviceCategorySchema,
  serviceCreateSchema,
  serviceSlugSchema,
  serviceUpdateSchema,
  specialistServiceUpsertSchema,
} from "@repo/contracts/services";
export type {
  PublicOfferService,
  PublicService,
  PublicSpecialistOffer,
  Service,
  ServiceArrangement,
  ServiceCategory,
  ServiceCreate,
  ServiceUpdate,
  SpecialistService,
  SpecialistServiceUpsert,
} from "@repo/contracts/services";
export {
  arrangeOffer,
  catalogAnchor,
  flattenOffer,
} from "@repo/contracts/offer-layout";
export type { OfferEntry, ServiceCatalog } from "@repo/contracts/offer-layout";
export {
  defaultFirstSteps,
  defaultHomeSections,
  firstStepsContentSchema,
  defaultRoomsPageContent,
  homePageContentSchema,
  homeSectionsContentSchema,
  homeSpotlightSchema,
  roomsPageContentSchema,
  SUPPORT_AREAS_MAX,
  supportAreaSchema,
  supportAreasContentSchema,
} from "@repo/contracts/cms";
export type {
  FirstStepsContent,
  HomeContentAdmin,
  HomePageContent,
  HomeSectionsContent,
  HomeSpotlight,
  RoomsPageContent,
  SiteContentAdmin,
  SupportArea,
  SupportAreasContent,
} from "@repo/contracts/cms";
export {
  emptyRichTextDocument,
  isRichTextEmpty,
  isSafeRichTextHref,
  parseRichText,
  plainTextFromRichText,
  richTextDocumentSchema,
  richTextDocumentWithMaxCharacters,
  serializeRichText,
} from "@repo/contracts/rich-text";
export type {
  RichTextBlockNode,
  RichTextDocument,
  RichTextInlineNode,
  RichTextMark,
} from "@repo/contracts/rich-text";
export {
  ROOM_IMAGE_LIMIT,
  roomAvailabilityExceptionCreateSchema,
  roomAvailabilityExceptionUpdateSchema,
  roomCapacitySchema,
  roomCreateSchema,
  roomOpeningHoursIntervalSchema,
  roomOpeningHoursReplaceSchema,
  roomPublicProfileSchema,
  roomSlugSchema,
  roomTimeSchema,
  roomUpdateSchema,
} from "@repo/contracts/rooms";
export type {
  AdminRoomDetail,
  AdminRoomSummary,
  EffectiveRoomAvailabilityInput,
  Room,
  RoomAvailabilityException,
  RoomAvailabilityExceptionCreate,
  RoomAvailabilityExceptionType,
  RoomAvailabilityExceptionUpdate,
  RoomCreate,
  RoomImage,
  RoomPlacement,
  RoomOpeningHoursInterval,
  RoomOpeningHoursIntervalInput,
  RoomOpeningHoursReplace,
  RoomPublicProfile,
  RoomPublicProfileInput,
  RoomTimeInterval,
  RoomUpdate,
} from "@repo/contracts/rooms";

export const userRoleSchema = z.enum(["admin", "specialist", "client"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export interface Appointment {
  id: string;
  specialistId: string;
  serviceId: string;
  startsAt: string;
}
export {
  COLOR_PALETTE,
  contrastRatio,
  hexColorSchema,
  isReadableOnLight,
} from "@repo/contracts/colors";
export type { PaletteColor } from "@repo/contracts/colors";
