import {
  defaultRoomsPageContent,
  homePageContentSchema,
  roomsPageContentSchema,
  type HomeContentAdmin,
  type HomePageContent,
  type RoomsPageContent,
  type SiteContentAdmin,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

// Each CMS page is one site_content row, its content typed by the page's
// schema (docs/architecture/cms-domain.md).
const HOME_KEY = "home";
const ROOMS_KEY = "rooms";

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
