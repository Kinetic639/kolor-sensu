import {
  defaultRoomsPageContent,
  homePageContentSchema,
  roomsPageContentSchema,
  supportAreasContentSchema,
  type HomeContentAdmin,
  type HomePageContent,
  type RoomsPageContent,
  type SiteContentAdmin,
  type SupportArea,
  type SupportAreasContent,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { validateSpecialistImage } from "./specialists";

// Each CMS page is one site_content row, its content typed by the page's
// schema (docs/architecture/cms-domain.md).
const HOME_KEY = "home";
const ROOMS_KEY = "rooms";
const SUPPORT_AREAS_KEY = "support_areas";

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

async function getPublished<Content>(
  client: SupabaseClient<Database>,
  key: string,
  schema: ContentSchema<Content>,
): Promise<Content | null> {
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
 * Uploads an area's photo (admins only) under a new name, so replacing it in
 * the draft never touches the file the published areas still show. Returns
 * its path, for the draft's imagePath.
 */
export async function uploadSupportAreaImage(
  client: SupabaseClient<Database>,
  file: File,
): Promise<string> {
  const problem = validateSpecialistImage(file);
  if (problem) throw new Error(problem);

  const extension =
    siteImageExtensions[file.type as keyof typeof siteImageExtensions];
  const path = `support-areas/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
