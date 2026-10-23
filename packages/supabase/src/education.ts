import type { ArticleDocument } from "@repo/contracts/article-rich-text";
import type { Database, Json } from "@repo/contracts/database";
import {
  articleDraftSchema,
  ebookDraftSchema,
  type ArticleCategory,
  type ArticleCategoryInput,
  type ArticleDraft,
  type ArticleSource,
  type AuthorKind,
  type EbookDraft,
  type EducationAdminRow,
  type EducationStatus,
  type PublishedArticle,
  type PublishedEbook,
} from "@repo/contracts/education";
import type { RichTextDocument } from "@repo/contracts/rich-text";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadSiteImage } from "./cms";

// Edukacja (docs/architecture/education-domain.md, migration
// 20261021120000_education.sql): the site reads published articles,
// categories and e-books from their columns (never the draft); the admin
// reads and writes drafts, publishes and withdraws through the database's
// functions, which check the role. A refusal to publish keeps the
// database's message ('article_incomplete:lead', …): PUBLISH_PROBLEMS in
// @repo/contracts/education says it in Polish.

type Client = SupabaseClient<Database>;

const SITE_MEDIA = "site-media";
const SITE_DOWNLOADS = "site-downloads";
const SAMPLE_MAX_BYTES = 20 * 1024 * 1024;

// ------------------------------------------------------------ categories

type CategoryRow = Database["public"]["Tables"]["article_categories"]["Row"];

const toCategory = (row: CategoryRow): ArticleCategory => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  sortOrder: row.sort_order,
});

/** Every category, in the admin's order. */
export async function listArticleCategories(
  client: Client,
): Promise<ArticleCategory[]> {
  const { data, error } = await client
    .from("article_categories")
    .select("id, slug, name, description, sort_order, created_at, updated_at")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toCategory);
}

const categoryColumns = (input: ArticleCategoryInput) => ({
  slug: input.slug,
  name: input.name,
  description: input.description,
  sort_order: input.sortOrder,
});

export async function createArticleCategory(
  client: Client,
  input: ArticleCategoryInput,
): Promise<string> {
  const { data, error } = await client
    .from("article_categories")
    .insert(categoryColumns(input))
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateArticleCategory(
  client: Client,
  id: string,
  input: ArticleCategoryInput,
): Promise<void> {
  const { error } = await client
    .from("article_categories")
    .update(categoryColumns(input))
    .eq("id", id);
  if (error) throw error;
}

/** Refused ('category_in_use') while an article has it. */
export async function deleteArticleCategory(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("delete_article_category", { p_id: id });
  if (error) throw error;
}

// ------------------------------------------------------------ articles: site

const ARTICLE_COLUMNS =
  "id, slug, title, lead, cover_path, cover_alt, category_id, body, author_kind, author_specialist_id, reviewer_specialist_id, sources, ebook_id, seo_title, seo_description, og_image_path, published_at, content_updated_at";

type ArticleRow = Pick<
  Database["public"]["Tables"]["articles"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "lead"
  | "cover_path"
  | "cover_alt"
  | "category_id"
  | "body"
  | "author_kind"
  | "author_specialist_id"
  | "reviewer_specialist_id"
  | "sources"
  | "ebook_id"
  | "seo_title"
  | "seo_description"
  | "og_image_path"
  | "published_at"
  | "content_updated_at"
>;

export function toPublishedArticle(row: ArticleRow): PublishedArticle {
  return {
    id: row.id,
    slug: row.slug ?? "",
    title: row.title ?? "",
    lead: row.lead ?? "",
    coverPath: row.cover_path ?? "",
    coverAlt: row.cover_alt ?? "",
    categoryId: row.category_id ?? "",
    body: row.body as unknown as ArticleDocument,
    authorKind: (row.author_kind ?? "team") as AuthorKind,
    authorSpecialistId: row.author_specialist_id,
    reviewerSpecialistId: row.reviewer_specialist_id,
    sources: (row.sources ?? []) as unknown as ArticleSource[],
    ebookId: row.ebook_id,
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    ogImagePath: row.og_image_path,
    publishedAt: row.published_at ?? "",
    contentUpdatedAt: row.content_updated_at ?? row.published_at ?? "",
  };
}

export interface PublishedArticleFilter {
  categoryId?: string;
  /** Written by this specialist. */
  authorSpecialistId?: string;
  /** Linked to this service. */
  serviceId?: string;
  /** Left out (the article being read, among its related ones). */
  excludeId?: string;
  limit?: number;
}

/** Published articles, newest first. */
export async function listPublishedArticles(
  client: Client,
  filter: PublishedArticleFilter = {},
): Promise<PublishedArticle[]> {
  let query = client
    .from("articles")
    .select(
      filter.serviceId
        ? `${ARTICLE_COLUMNS}, article_services!inner(service_id)`
        : ARTICLE_COLUMNS,
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);
  if (filter.authorSpecialistId)
    query = query.eq("author_specialist_id", filter.authorSpecialistId);
  if (filter.serviceId)
    query = query.eq("article_services.service_id", filter.serviceId);
  if (filter.excludeId) query = query.neq("id", filter.excludeId);
  if (filter.limit) query = query.limit(filter.limit);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as ArticleRow[]).map(toPublishedArticle);
}

export async function getPublishedArticleBySlug(
  client: Client,
  slug: string,
): Promise<PublishedArticle | null> {
  const { data, error } = await client
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toPublishedArticle(data as ArticleRow) : null;
}

/** The services and specialists a published article is linked to. */
export async function getPublishedArticleLinks(
  client: Client,
  articleId: string,
): Promise<{ serviceIds: string[]; specialistIds: string[] }> {
  const [services, specialists] = await Promise.all([
    client
      .from("article_services")
      .select("service_id")
      .eq("article_id", articleId),
    client
      .from("article_specialists")
      .select("specialist_id")
      .eq("article_id", articleId),
  ]);
  if (services.error) throw services.error;
  if (specialists.error) throw specialists.error;
  return {
    serviceIds: (services.data ?? []).map((row) => row.service_id),
    specialistIds: (specialists.data ?? []).map((row) => row.specialist_id),
  };
}

/** Where an old address of a published article now is, if anywhere. */
export async function getArticleSlugRedirect(
  client: Client,
  oldSlug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("article_slug_redirects")
    .select("articles!inner(slug, status)")
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (error) throw error;
  const article = (data as { articles?: { slug: string | null } } | null)
    ?.articles;
  return article?.slug ?? null;
}

/**
 * An article's draft as the site's preview shows it, read with the
 * service-role client on the server (only in Draft Mode, opened from the
 * portal): shaped like a published article, dated now.
 */
export async function getArticleDraftPreview(
  secretClient: Client,
  id: string,
): Promise<{
  article: PublishedArticle;
  serviceIds: string[];
  specialistIds: string[];
} | null> {
  const { data, error } = await secretClient
    .from("articles")
    .select("id, draft")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const draft = readArticleDraft(data.draft);
  const now = new Date().toISOString();
  const article: PublishedArticle = {
    id: data.id,
    slug: draft.slug,
    title: draft.title,
    lead: draft.lead,
    coverPath: draft.coverPath ?? "",
    coverAlt: draft.coverAlt,
    categoryId: draft.categoryId ?? "",
    body: draft.body,
    authorKind: draft.authorKind,
    authorSpecialistId: draft.authorSpecialistId,
    reviewerSpecialistId: draft.reviewerSpecialistId,
    sources: draft.sources,
    ebookId: draft.ebookId,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    ogImagePath: draft.ogImagePath,
    publishedAt: now,
    contentUpdatedAt: now,
  };
  return {
    article,
    serviceIds: draft.serviceIds,
    specialistIds: draft.specialistIds,
  };
}

// ------------------------------------------------------------ articles: admin

type AdminRow = {
  id: string;
  status: string;
  draft: Json;
  slug: string | null;
  published_at: string | null;
  updated_at: string;
  has_unpublished_changes: boolean;
};

function toAdminRow<Draft>(
  row: AdminRow,
  parse: (draft: unknown) => Draft,
): EducationAdminRow<Draft> {
  return {
    id: row.id,
    status: row.status as EducationStatus,
    draft: parse(row.draft),
    slug: row.slug,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    hasUnpublishedChanges: row.has_unpublished_changes,
  };
}

// A stored draft is read as the contract has it; one that no longer fits
// (an older shape) is still shown, as stored, to be fixed in the form.
const readArticleDraft = (draft: unknown) => {
  const parsed = articleDraftSchema.safeParse(draft);
  return parsed.success ? parsed.data : (draft as ArticleDraft);
};
const readEbookDraft = (draft: unknown) => {
  const parsed = ebookDraftSchema.safeParse(draft);
  return parsed.success ? parsed.data : (draft as EbookDraft);
};

export async function listArticlesAdmin(
  client: Client,
): Promise<EducationAdminRow<ArticleDraft>[]> {
  const { data, error } = await client.rpc("list_articles_admin");
  if (error) throw error;
  return (data ?? []).map((row) => toAdminRow(row, readArticleDraft));
}

export interface EducationAdminItem<Draft> {
  id: string;
  status: EducationStatus;
  draft: Draft;
  slug: string | null;
  publishedAt: string | null;
  contentUpdatedAt: string | null;
  updatedAt: string;
}

export async function getArticleAdmin(
  client: Client,
  id: string,
): Promise<EducationAdminItem<ArticleDraft> | null> {
  const { data, error } = await client.rpc("get_article_admin", { p_id: id });
  if (error) throw error;
  if (!data) return null;
  const item = data as unknown as EducationAdminItem<unknown>;
  return { ...item, draft: readArticleDraft(item.draft) };
}

export async function createArticle(
  client: Client,
  draft: ArticleDraft,
): Promise<string> {
  const { data, error } = await client.rpc("create_article", {
    p_draft: articleDraftSchema.parse(draft) as unknown as Json,
  });
  if (error) throw error;
  return data;
}

export async function saveArticleDraft(
  client: Client,
  id: string,
  draft: ArticleDraft,
): Promise<void> {
  const { error } = await client.rpc("save_article_draft", {
    p_id: id,
    p_draft: articleDraftSchema.parse(draft) as unknown as Json,
  });
  if (error) throw error;
}

export async function publishArticle(client: Client, id: string) {
  const { error } = await client.rpc("publish_article", { p_id: id });
  if (error) throw error;
}

export async function unpublishArticle(client: Client, id: string) {
  const { error } = await client.rpc("unpublish_article", { p_id: id });
  if (error) throw error;
}

export async function deleteArticle(client: Client, id: string) {
  const { error } = await client.rpc("delete_article", { p_id: id });
  if (error) throw error;
}

// ------------------------------------------------------------ e-books: site

const EBOOK_COLUMNS =
  "id, slug, title, cover_path, cover_alt, short_description, description, audience, contents, format, naffy_url, show_price, video_url, sample_path, seo_title, seo_description, og_image_path, published_at, content_updated_at";

type EbookRow = Pick<
  Database["public"]["Tables"]["ebooks"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "cover_path"
  | "cover_alt"
  | "short_description"
  | "description"
  | "audience"
  | "contents"
  | "format"
  | "naffy_url"
  | "show_price"
  | "video_url"
  | "sample_path"
  | "seo_title"
  | "seo_description"
  | "og_image_path"
  | "published_at"
  | "content_updated_at"
>;

export function toPublishedEbook(row: EbookRow): PublishedEbook {
  return {
    id: row.id,
    slug: row.slug ?? "",
    title: row.title ?? "",
    coverPath: row.cover_path ?? "",
    coverAlt: row.cover_alt ?? "",
    shortDescription: row.short_description ?? "",
    description: row.description as unknown as RichTextDocument,
    audience: row.audience ?? "",
    contents: (row.contents ?? []) as unknown as string[],
    format: row.format ?? "",
    naffyUrl: row.naffy_url ?? "",
    showPrice: row.show_price,
    videoUrl: row.video_url ?? "",
    samplePath: row.sample_path,
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    ogImagePath: row.og_image_path,
    publishedAt: row.published_at ?? "",
    contentUpdatedAt: row.content_updated_at ?? row.published_at ?? "",
  };
}

/** Published e-books, newest first. */
export async function listPublishedEbooks(
  client: Client,
): Promise<PublishedEbook[]> {
  const { data, error } = await client
    .from("ebooks")
    .select(EBOOK_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as EbookRow[]).map(toPublishedEbook);
}

export async function getPublishedEbookBySlug(
  client: Client,
  slug: string,
): Promise<PublishedEbook | null> {
  const { data, error } = await client
    .from("ebooks")
    .select(EBOOK_COLUMNS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toPublishedEbook(data as EbookRow) : null;
}

/** A published e-book by id (the one an article recommends), or null. */
export async function getPublishedEbook(
  client: Client,
  id: string,
): Promise<PublishedEbook | null> {
  const { data, error } = await client
    .from("ebooks")
    .select(EBOOK_COLUMNS)
    .eq("status", "published")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toPublishedEbook(data as EbookRow) : null;
}

export async function getEbookSlugRedirect(
  client: Client,
  oldSlug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("ebook_slug_redirects")
    .select("ebooks!inner(slug, status)")
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (error) throw error;
  const ebook = (data as { ebooks?: { slug: string | null } } | null)?.ebooks;
  return ebook?.slug ?? null;
}

// ------------------------------------------------------------ e-books: admin

export async function listEbooksAdmin(
  client: Client,
): Promise<EducationAdminRow<EbookDraft>[]> {
  const { data, error } = await client.rpc("list_ebooks_admin");
  if (error) throw error;
  return (data ?? []).map((row) => toAdminRow(row, readEbookDraft));
}

export async function getEbookAdmin(
  client: Client,
  id: string,
): Promise<EducationAdminItem<EbookDraft> | null> {
  const { data, error } = await client.rpc("get_ebook_admin", { p_id: id });
  if (error) throw error;
  if (!data) return null;
  const item = data as unknown as EducationAdminItem<unknown>;
  return { ...item, draft: readEbookDraft(item.draft) };
}

export async function createEbook(
  client: Client,
  draft: EbookDraft,
): Promise<string> {
  const { data, error } = await client.rpc("create_ebook", {
    p_draft: ebookDraftSchema.parse(draft) as unknown as Json,
  });
  if (error) throw error;
  return data;
}

export async function saveEbookDraft(
  client: Client,
  id: string,
  draft: EbookDraft,
): Promise<void> {
  const { error } = await client.rpc("save_ebook_draft", {
    p_id: id,
    p_draft: ebookDraftSchema.parse(draft) as unknown as Json,
  });
  if (error) throw error;
}

export async function publishEbook(client: Client, id: string) {
  const { error } = await client.rpc("publish_ebook", { p_id: id });
  if (error) throw error;
}

export async function unpublishEbook(client: Client, id: string) {
  const { error } = await client.rpc("unpublish_ebook", { p_id: id });
  if (error) throw error;
}

export async function deleteEbook(client: Client, id: string) {
  const { error } = await client.rpc("delete_ebook", { p_id: id });
  if (error) throw error;
}

// ------------------------------------------------------------ files

/** An article's or e-book's image, in site-media (admins only). */
export function uploadEducationImage(
  client: Client,
  file: File,
  folder: "articles" | "ebooks",
): Promise<string> {
  return uploadSiteImage(client, file, folder);
}

/** An e-book's free sample: a PDF of at most 20 MB (admins only). */
export async function uploadEbookSample(
  client: Client,
  file: File,
): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("Fragment musi być plikiem PDF.");
  }
  if (file.size > SAMPLE_MAX_BYTES) {
    throw new Error("Plik PDF może mieć najwyżej 20 MB.");
  }
  const path = `ebooks/${crypto.randomUUID()}.pdf`;
  const { error } = await client.storage
    .from(SITE_DOWNLOADS)
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  return path;
}

/** An image's public address (site-media). */
export function educationImageUrl(client: Client, path: string): string {
  return client.storage.from(SITE_MEDIA).getPublicUrl(path).data.publicUrl;
}

/** A sample's public address, served as a download. */
export function ebookSampleUrl(
  client: Client,
  path: string,
  fileName: string,
): string {
  return client.storage
    .from(SITE_DOWNLOADS)
    .getPublicUrl(path, { download: fileName }).data.publicUrl;
}
