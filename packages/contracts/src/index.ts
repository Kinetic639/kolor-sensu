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
  crisisHelpContentSchema,
  defaultCrisisHelp,
  defaultHomeLocation,
  defaultNewsletterBand,
  defaultWhyUs,
  homeLocationContentSchema,
  newsletterBandContentSchema,
  whyUsContentSchema,
  defaultFirstSteps,
  defaultHomeHeaders,
  defaultHomeSections,
  HOME_HEADER_SECTIONS,
  homeHeadersContentSchema,
  firstStepsContentSchema,
  defaultRoomsAmenities,
  defaultRoomsIntro,
  defaultRoomsPageContent,
  defaultHeroPoints,
  defaultHomeStory,
  defaultHomeThoughts,
  HERO_POINT_ICONS,
  HERO_POINTS_MAX,
  heroPointSchema,
  HOME_STORY_STEPS_MAX,
  homePageContentSchema,
  homeStoryContentSchema,
  homeStoryStepSchema,
  HOME_THOUGHT_PAIRS_MAX,
  HOME_THOUGHT_PAIRS_MIN,
  homeThoughtPairSchema,
  homeThoughtsContentSchema,
  pairLegacyThoughts,
  storedHomeThoughtsContentSchema,
  homeSectionsContentSchema,
  homeSpotlightSchema,
  roomsPageContentSchema,
  SUPPORT_AREAS_MAX,
  supportAreaSchema,
  supportAreasContentSchema,
} from "@repo/contracts/cms";
export type {
  CrisisHelpContent,
  HomeLocationContent,
  NewsletterBandContent,
  WhyUsContent,
  FirstStepsContent,
  HomeContentAdmin,
  HomeHeaderSection,
  HomeHeadersContent,
  HeroPoint,
  HomePageContent,
  HomeStoryContent,
  HomeStoryStep,
  HomeThoughtPair,
  HomeThoughtsContent,
  HomeSectionsContent,
  HomeSpotlight,
  RoomsPageContent,
  SiteContentAdmin,
  SupportArea,
  SupportAreasContent,
} from "@repo/contracts/cms";
export {
  defaultSiteAppearance,
  SITE_APPEARANCE_KEY,
  siteAppearanceContentSchema,
} from "@repo/contracts/cms-appearance";
export type { SiteAppearanceContent } from "@repo/contracts/cms-appearance";
export {
  defaultPageSeo,
  defaultSeoTitle,
  pageSeoContentSchema,
  resolvePageSeo,
  SEO_DESCRIPTION_RECOMMENDED,
  SEO_PAGES,
  SEO_SITE_NAME,
  SEO_TITLE_RECOMMENDED,
  seoContentKey,
  seoPageDefinition,
} from "@repo/contracts/cms-seo";
export type {
  PageSeoContent,
  ResolvedPageSeo,
  SeoPage,
  SeoPageDefinition,
} from "@repo/contracts/cms-seo";
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
export {
  CTA_STYLES,
  HEADER_LIMITS,
  HEADER_TONES,
  SITE_PAGES,
  descriptionPartSchema,
  headerCtaSchema,
  headerEyebrowSchema,
  headerTitleText,
  headerToneSchema,
  plainHeader,
  sectionHeaderSchema,
  sitePageSchema,
  titleLineSchema,
  bookedService,
  headerHrefSchema,
  serviceBookingHref,
  titleSegmentSchema,
} from "@repo/contracts/section-header";
export type {
  CtaStyle,
  DescriptionPart,
  HeaderCta,
  HeaderEyebrow,
  HeaderTone,
  SectionHeaderContent,
  SitePage,
  TitleSegment,
  HeaderHref,
  ServiceBookingHref,
} from "@repo/contracts/section-header";
export {
  PAGE_HEADER_LIMITS,
  pageHeader,
  pageHeaderSchema,
  sitePathSchema,
} from "@repo/contracts/cms-shared";
export type { PageHeaderContent } from "@repo/contracts/cms-shared";
export {
  ABOUT_AUDIENCES_MAX,
  ABOUT_HEADER_SECTIONS,
  ABOUT_PROFESSIONALISM_MAX,
  ABOUT_VALUES_COUNT,
  aboutHeadersContentSchema,
  aboutPageContentSchema,
  CONTACT_FAQ_MAX,
  closingCtaContentSchema,
  contactPageContentSchema,
  defaultAboutAudiences,
  defaultAboutHeaders,
  defaultAboutIntro,
  defaultAboutPage,
  defaultAboutValues,
  defaultClosingCta,
  defaultContactFaq,
  defaultContactPage,
  defaultEducationPage,
  defaultSiteContact,
  defaultSpecialistsPage,
  educationPageContentSchema,
  siteContactContentSchema,
  specialistsPageContentSchema,
} from "@repo/contracts/cms-pages";
export type {
  AboutAudience,
  AboutHeaderSection,
  AboutHeadersContent,
  AboutPageContent,
  ClosingCtaContent,
  ContactFaqItem,
  ContactPageContent,
  EducationPageContent,
  SiteContactContent,
  SpecialistsPageContent,
} from "@repo/contracts/cms-pages";
export { LEGAL_PAGES, legalPageContentSchema } from "@repo/contracts/cms-legal";
export type { LegalPageContent, LegalPageKey } from "@repo/contracts/cms-legal";
export {
  defaultOfferPage,
  defaultPricesPage,
  defaultServicePage,
  offerPageContentSchema,
  PRICE_RULES_MAX,
  pricesPageContentSchema,
  servicePageContentSchema,
} from "@repo/contracts/cms-offer";
export type {
  OfferPageContent,
  PriceRule,
  PricesPageContent,
  ServicePageContent,
} from "@repo/contracts/cms-offer";
export {
  CONTACT_MESSAGE_MAX,
  contactMessageInputSchema,
} from "@repo/contracts/contact";
export type { ContactMessageInput } from "@repo/contracts/contact";
