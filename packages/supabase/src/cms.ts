import {
  homePageContentSchema,
  type HomeContentAdmin,
  type HomePageContent,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

const HOME_KEY = "home";

type SiteContentRow = Database["public"]["Tables"]["site_content"]["Row"];
type PublicSiteContentQueryRow = Pick<
  SiteContentRow,
  "key" | "published_payload" | "published_at"
>;

export async function getHomeContentAdmin(
  client: SupabaseClient<Database>,
): Promise<HomeContentAdmin> {
  const { data, error } = await client
    .from("site_content")
    .select("*")
    .eq("key", HOME_KEY)
    .single();

  if (error) throw error;

  return {
    draft: homePageContentSchema.parse(data.draft_payload),
    published: data.published_payload
      ? homePageContentSchema.parse(data.published_payload)
      : null,
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
  };
}

export async function updateHomeDraft(
  client: SupabaseClient<Database>,
  input: HomePageContent,
): Promise<HomePageContent> {
  const content = homePageContentSchema.parse(input);
  const { data, error } = await client
    .from("site_content")
    .update({ draft_payload: content })
    .eq("key", HOME_KEY)
    .select("draft_payload")
    .single();

  if (error) throw error;
  return homePageContentSchema.parse(data.draft_payload);
}

export async function publishHomeContent(
  client: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await client.rpc("publish_site_content", {
    p_key: HOME_KEY,
  });
  if (error) throw error;
}

export async function getPublishedHomeContent(
  client: SupabaseClient<Database>,
): Promise<HomePageContent | null> {
  const { data, error } = await client
    .from("site_content")
    .select("key, published_payload, published_at")
    .eq("key", HOME_KEY)
    .maybeSingle();

  if (error) throw error;
  const row = data as PublicSiteContentQueryRow | null;
  if (!row?.published_payload) return null;

  return homePageContentSchema.parse(row.published_payload);
}
