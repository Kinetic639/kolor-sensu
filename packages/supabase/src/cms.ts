import {
  crisisHelpContentSchema,
  defaultCrisisHelp,
  defaultHomeStory,
  defaultHomeThoughts,
  homeStoryContentSchema,
  storedHomeThoughtsContentSchema,
  type HomeStoryContent,
  type HomeThoughtsContent,
  defaultHomeLocation,
  defaultNewsletterBand,
  defaultWhyUs,
  homeLocationContentSchema,
  newsletterBandContentSchema,
  whyUsContentSchema,
  type CrisisHelpContent,
  type HomeLocationContent,
  type NewsletterBandContent,
  type WhyUsContent,
  defaultFirstSteps,
  defaultHomeHeaders,
  defaultHomeSections,
  defaultRoomsPageContent,
  firstStepsContentSchema,
  homeHeadersContentSchema,
  homePageContentSchema,
  homeSectionsContentSchema,
  roomsPageContentSchema,
  supportAreasContentSchema,
  type FirstStepsContent,
  type HomeContentAdmin,
  type HomeHeadersContent,
  type HomePageContent,
  type HomeSectionsContent,
  type RoomsPageContent,
  type SiteContentAdmin,
  type SupportArea,
  type SupportAreasContent,
  defaultPageSeo,
  pageSeoContentSchema,
  seoContentKey,
  type PageSeoContent,
  type SeoPage,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { validateSpecialistImage } from "./specialists";

// Each CMS page is one site_content row, its content typed by the page's
// schema (docs/architecture/cms-domain.md).
const HOME_KEY = "home";
const ROOMS_KEY = "rooms";
const SUPPORT_AREAS_KEY = "support_areas";
const HOME_SECTIONS_KEY = "home_sections";
const FIRST_STEPS_KEY = "first_steps";
const HOME_HEADERS_KEY = "home_headers";
const WHY_US_KEY = "why_us";
const NEWSLETTER_BAND_KEY = "newsletter_band";
const HOME_LOCATION_KEY = "home_location";
const CRISIS_HELP_KEY = "crisis_help";
const HOME_THOUGHTS_KEY = "home_thoughts";
const HOME_STORY_KEY = "home_story";

// The site's own photos: a public bucket only admins write to.
const SITE_MEDIA_BUCKET = "site-media";
const siteImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type SiteContentRow = Database["public"]["Tables"]["site_content"]["Row"];
type PublicSiteContentQueryRow = Pick<
  SiteContentRow,
  "key" | "published_payload" | "published_at"
>;
type ContentSchema<Content> = z.ZodType<Content>;

// The headers as stored: until the migrations have run (and while a deploy
// runs ahead of them), they may still carry the homepage's former
// questions-and-answers header, which is left out when read, and lack the
// headers of the sections added since, which read as the site's own words.
const storedHomeHeadersSchema: ContentSchema<HomeHeadersContent> = z.preprocess(
  (payload) => {
    if (typeof payload !== "object" || payload === null) return payload;
    const { faq: _faq, ...headers } = payload as Record<string, unknown>;
    const { whyUs, newsletter, location } = defaultHomeHeaders;
    return { whyUs, newsletter, location, ...headers };
  },
  homeHeadersContentSchema,
);

async function getContentAdmin<Content>(
  client: SupabaseClient<Database>,
  key: string,
  schema: ContentSchema<Content>,
): Promise<SiteContentAdmin<Content>> {
  const { data, error } = await client
    .from("site_content")
    .select("*")
    .eq("key", key)
    .single();

  if (error) throw error;

  return {
    draft: schema.parse(data.draft_payload),
    published: data.published_payload
      ? schema.parse(data.published_payload)
      : null,
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
  };
}

async function updateDraft<Content>(
  client: SupabaseClient<Database>,
  key: string,
  schema: ContentSchema<Content>,
  input: Content,
): Promise<Content> {
  const content = schema.parse(input);
  const { data, error } = await client
    .from("site_content")
    .update({ draft_payload: content as never })
    .eq("key", key)
    .select("draft_payload")
    .single();

  if (error) throw error;
  return schema.parse(data.draft_payload);
}

async function publish(
  client: SupabaseClient<Database>,
  key: string,
): Promise<void> {
  const { error } = await client.rpc("publish_site_content", { p_key: key });
  if (error) throw error;
}

// The site's preview (Draft Mode, docs/architecture/cms-domain.md "Preview
// on the site"): a client registered here reads each section's draft, by
// its reader, wherever the site reads the published content.

/** Reads one section's draft (null when it has none). */
export type SiteContentDraftReader = (key: string) => Promise<unknown>;

const draftReaders = new WeakMap<object, SiteContentDraftReader>();

/**
 * Makes every read of published content through `client` (getPublished:
 * each getPublished* and every section's `published`) return the section's
 * draft instead, read by `readDraft`, validated by the same schema. Its
 * other reads are unchanged. Only for a client made for one preview
 * request: never a client a visitor's request could reuse.
 */
export function withSiteContentDrafts<Client extends object>(
  client: Client,
  readDraft: SiteContentDraftReader,
): Client {
  draftReaders.set(client, readDraft);
  return client;
}

/**
 * One section's draft, through the function only service_role may execute:
 * `client` is the site's service-role client, on its server.
 */
export async function readSiteContentDraft(
  client: SupabaseClient<Database>,
  key: string,
): Promise<unknown> {
  const { data, error } = await client.rpc("get_site_content_draft", {
    p_key: key,
  });
  if (error) throw error;
  return data;
}

/** When any section last changed (service-role client only). */
export async function getSiteContentDraftVersion(
  client: SupabaseClient<Database>,
): Promise<string | null> {
  const { data, error } = await client.rpc("get_site_content_draft_version");
  if (error) throw error;
  return data;
}

async function getPublished<Content>(
  client: SupabaseClient<Database>,
  key: string,
  schema: ContentSchema<Content>,
): Promise<Content | null> {
  const readDraft = draftReaders.get(client);
  if (readDraft) {
    const draft = await readDraft(key);
    return draft == null ? null : schema.parse(draft);
  }

  const { data, error } = await client
    .from("site_content")
    .select("key, published_payload, published_at")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  const row = data as PublicSiteContentQueryRow | null;
  if (!row?.published_payload) return null;

  return schema.parse(row.published_payload);
}

export function getHomeContentAdmin(
  client: SupabaseClient<Database>,
): Promise<HomeContentAdmin> {
  return getContentAdmin(client, HOME_KEY, homePageContentSchema);
}

export function updateHomeDraft(
  client: SupabaseClient<Database>,
  input: HomePageContent,
): Promise<HomePageContent> {
  return updateDraft(client, HOME_KEY, homePageContentSchema, input);
}

export function publishHomeContent(
  client: SupabaseClient<Database>,
): Promise<void> {
  return publish(client, HOME_KEY);
}

export function getPublishedHomeContent(
  client: SupabaseClient<Database>,
): Promise<HomePageContent | null> {
  return getPublished(client, HOME_KEY, homePageContentSchema);
}

export function getRoomsPageContentAdmin(
  client: SupabaseClient<Database>,
): Promise<SiteContentAdmin<RoomsPageContent>> {
  return getContentAdmin(client, ROOMS_KEY, roomsPageContentSchema);
}

export function updateRoomsPageDraft(
  client: SupabaseClient<Database>,
  input: RoomsPageContent,
): Promise<RoomsPageContent> {
  return updateDraft(client, ROOMS_KEY, roomsPageContentSchema, input);
}

export function publishRoomsPageContent(
  client: SupabaseClient<Database>,
): Promise<void> {
  return publish(client, ROOMS_KEY);
}

/** The published switches; every section is shown until something is published. */
export async function getPublishedRoomsPageContent(
  client: SupabaseClient<Database>,
): Promise<RoomsPageContent> {
  return (
    (await getPublished(client, ROOMS_KEY, roomsPageContentSchema)) ??
    defaultRoomsPageContent
  );
}

/** An area of help as the site shows it: its photo as an address. */
export interface PublicSupportArea {
  id: string;
  title: string;
  lead: string;
  image: { src: string; alt: string } | null;
  link: SupportArea["link"];
}

export function getSupportAreasAdmin(
  client: SupabaseClient<Database>,
): Promise<SiteContentAdmin<SupportAreasContent>> {
  return getContentAdmin(client, SUPPORT_AREAS_KEY, supportAreasContentSchema);
}

export function updateSupportAreasDraft(
  client: SupabaseClient<Database>,
  input: SupportAreasContent,
): Promise<SupportAreasContent> {
  return updateDraft(
    client,
    SUPPORT_AREAS_KEY,
    supportAreasContentSchema,
    input,
  );
}

export function publishSupportAreas(
  client: SupabaseClient<Database>,
): Promise<void> {
  return publish(client, SUPPORT_AREAS_KEY);
}

/** The published areas; null until the admin first publishes them. */
export async function getPublishedSupportAreas(
  client: SupabaseClient<Database>,
): Promise<PublicSupportArea[] | null> {
  const content = await getPublished(
    client,
    SUPPORT_AREAS_KEY,
    supportAreasContentSchema,
  );
  if (!content) return null;
  return content.areas.map((area) => ({
    id: area.id,
    title: area.title,
    lead: area.lead,
    image: area.imagePath
      ? {
          src: supportAreaImageUrl(client, area.imagePath),
          alt: area.imageAlt,
        }
      : null,
    link: area.link,
  }));
}

/** A photo's public address in the site-media bucket. */
export function supportAreaImageUrl(
  client: SupabaseClient<Database>,
  path: string,
): string {
  return client.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

/**
 * Uploads one of the site's own photos (admins only) into `folder` of the
 * public site-media bucket, under a new name, so replacing it in a draft
 * never touches the file the published page still shows. Returns its path.
 */
export async function uploadSiteImage(
  client: SupabaseClient<Database>,
  file: File,
  folder: "support-areas" | "spotlight" | "hero" | "story" | "seo",
): Promise<string> {
  const problem = validateSpecialistImage(file);
  if (problem) throw new Error(problem);

  const extension =
    siteImageExtensions[file.type as keyof typeof siteImageExtensions];
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** An area of help's photo (see uploadSiteImage). */
export function uploadSupportAreaImage(
  client: SupabaseClient<Database>,
  file: File,
): Promise<string> {
  return uploadSiteImage(client, file, "support-areas");
}

export function getHomeSectionsAdmin(
  client: SupabaseClient<Database>,
): Promise<SiteContentAdmin<HomeSectionsContent>> {
  return getContentAdmin(client, HOME_SECTIONS_KEY, homeSectionsContentSchema);
}

export function updateHomeSectionsDraft(
  client: SupabaseClient<Database>,
  input: HomeSectionsContent,
): Promise<HomeSectionsContent> {
  return updateDraft(
    client,
    HOME_SECTIONS_KEY,
    homeSectionsContentSchema,
    input,
  );
}

export function publishHomeSections(
  client: SupabaseClient<Database>,
): Promise<void> {
  return publish(client, HOME_SECTIONS_KEY);
}

/** The published sections; the team shown, no spotlight, until then. */
export async function getPublishedHomeSections(
  client: SupabaseClient<Database>,
): Promise<HomeSectionsContent> {
  return (
    (await getPublished(
      client,
      HOME_SECTIONS_KEY,
      homeSectionsContentSchema,
    )) ?? defaultHomeSections
  );
}

export function getFirstStepsAdmin(
  client: SupabaseClient<Database>,
): Promise<SiteContentAdmin<FirstStepsContent>> {
  return getContentAdmin(client, FIRST_STEPS_KEY, firstStepsContentSchema);
}

export function updateFirstStepsDraft(
  client: SupabaseClient<Database>,
  input: FirstStepsContent,
): Promise<FirstStepsContent> {
  return updateDraft(client, FIRST_STEPS_KEY, firstStepsContentSchema, input);
}

export function publishFirstSteps(
  client: SupabaseClient<Database>,
): Promise<void> {
  return publish(client, FIRST_STEPS_KEY);
}

/** The published band; the site's own steps, shown, until then. */
export async function getPublishedFirstSteps(
  client: SupabaseClient<Database>,
): Promise<FirstStepsContent> {
  return (
    (await getPublished(client, FIRST_STEPS_KEY, firstStepsContentSchema)) ??
    defaultFirstSteps
  );
}

export function getHomeHeadersAdmin(
  client: SupabaseClient<Database>,
): Promise<SiteContentAdmin<HomeHeadersContent>> {
  return getContentAdmin(client, HOME_HEADERS_KEY, storedHomeHeadersSchema);
}

export function updateHomeHeadersDraft(
  client: SupabaseClient<Database>,
  input: HomeHeadersContent,
): Promise<HomeHeadersContent> {
  return updateDraft(client, HOME_HEADERS_KEY, homeHeadersContentSchema, input);
}

export function publishHomeHeaders(
  client: SupabaseClient<Database>,
): Promise<void> {
  return publish(client, HOME_HEADERS_KEY);
}

/** The homepage's published headers; the site's own words until then. */
export async function getPublishedHomeHeaders(
  client: SupabaseClient<Database>,
): Promise<HomeHeadersContent> {
  return (
    (await getPublished(client, HOME_HEADERS_KEY, storedHomeHeadersSchema)) ??
    defaultHomeHeaders
  );
}

// A section of plain content: its admin read, draft save, publication and
// published read (the default until something is published).
function contentSection<Content>(
  key: string,
  schema: ContentSchema<Content>,
  fallback: Content,
) {
  return {
    admin: (client: SupabaseClient<Database>) =>
      getContentAdmin(client, key, schema),
    update: (client: SupabaseClient<Database>, input: Content) =>
      updateDraft(client, key, schema, input),
    publish: (client: SupabaseClient<Database>) => publish(client, key),
    published: async (client: SupabaseClient<Database>) =>
      (await getPublished(client, key, schema)) ?? fallback,
  };
}

/** Home → "Dlaczego my": hidden, with the site's facts, until published. */
const whyUs = contentSection<WhyUsContent>(
  WHY_US_KEY,
  whyUsContentSchema,
  defaultWhyUs,
);
export const getWhyUsAdmin = whyUs.admin;
export const updateWhyUsDraft = whyUs.update;
export const publishWhyUs = whyUs.publish;
export const getPublishedWhyUs = whyUs.published;

/** Home → the newsletter band: hidden until published. */
const newsletterBand = contentSection<NewsletterBandContent>(
  NEWSLETTER_BAND_KEY,
  newsletterBandContentSchema,
  defaultNewsletterBand,
);
export const getNewsletterBandAdmin = newsletterBand.admin;
export const updateNewsletterBandDraft = newsletterBand.update;
export const publishNewsletterBand = newsletterBand.publish;
export const getPublishedNewsletterBand = newsletterBand.published;

/** Home → "Gdzie jesteśmy": shown until published otherwise. */
const homeLocation = contentSection<HomeLocationContent>(
  HOME_LOCATION_KEY,
  homeLocationContentSchema,
  defaultHomeLocation,
);
export const getHomeLocationAdmin = homeLocation.admin;
export const updateHomeLocationDraft = homeLocation.update;
export const publishHomeLocation = homeLocation.publish;
export const getPublishedHomeLocation = homeLocation.published;

/** Home → the crisis strip: the site's numbers until published. */
const crisisHelp = contentSection<CrisisHelpContent>(
  CRISIS_HELP_KEY,
  crisisHelpContentSchema,
  defaultCrisisHelp,
);
export const getCrisisHelpAdmin = crisisHelp.admin;
export const updateCrisisHelpDraft = crisisHelp.update;
export const publishCrisisHelp = crisisHelp.publish;
export const getPublishedCrisisHelp = crisisHelp.published;

/**
 * Home → "Myśli, które się odmieniają": the site's thoughts until published.
 * Read through the stored shape: a row saved before the pairs reads as pairs.
 */
const homeThoughts = contentSection<HomeThoughtsContent>(
  HOME_THOUGHTS_KEY,
  storedHomeThoughtsContentSchema,
  defaultHomeThoughts,
);
export const getHomeThoughtsAdmin = homeThoughts.admin;
export const updateHomeThoughtsDraft = homeThoughts.update;
export const publishHomeThoughts = homeThoughts.publish;
export const getPublishedHomeThoughts = homeThoughts.published;

/** Home → the story told while scrolling: the site's steps until published. */
const homeStory = contentSection<HomeStoryContent>(
  HOME_STORY_KEY,
  homeStoryContentSchema,
  defaultHomeStory,
);
export const getHomeStoryAdmin = homeStory.admin;
export const updateHomeStoryDraft = homeStory.update;
export const publishHomeStory = homeStory.publish;
export const getPublishedHomeStory = homeStory.published;

/**
 * A page's search and sharing settings (`seo_<page>`): every field empty,
 * the page's own, until published.
 */
function pageSeo(page: SeoPage) {
  return contentSection<PageSeoContent>(
    seoContentKey(page),
    pageSeoContentSchema,
    defaultPageSeo,
  );
}

export function getPageSeoAdmin(
  client: SupabaseClient<Database>,
  page: SeoPage,
): Promise<SiteContentAdmin<PageSeoContent>> {
  return pageSeo(page).admin(client);
}

export function updatePageSeoDraft(
  client: SupabaseClient<Database>,
  page: SeoPage,
  input: PageSeoContent,
): Promise<PageSeoContent> {
  return pageSeo(page).update(client, input);
}

export function publishPageSeo(
  client: SupabaseClient<Database>,
  page: SeoPage,
): Promise<void> {
  return pageSeo(page).publish(client);
}

export function getPublishedPageSeo(
  client: SupabaseClient<Database>,
  page: SeoPage,
): Promise<PageSeoContent> {
  return pageSeo(page).published(client);
}
