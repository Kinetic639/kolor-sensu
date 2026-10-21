import { z } from "zod";
import {
  articleDocumentSchema,
  emptyArticleDocument,
  headingSlug,
  type ArticleDocument,
} from "@repo/contracts/article-rich-text";
import {
  emptyRichTextDocument,
  isSafeRichTextHref,
  richTextDocumentSchema,
  type RichTextDocument,
} from "@repo/contracts/rich-text";

// Edukacja (docs/architecture/education-domain.md): an article's and an
// e-book's working version (what the admin edits; the database keeps it in
// `draft` and checks its outline), their published versions (what the
// site reads), and article categories. Publishing copies a complete draft;
// what it lacks is named by the database (PUBLISH_PROBLEMS says it in
// Polish).

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const educationSlugSchema = z
  .string()
  .regex(SLUG, "Adres: małe litery, cyfry i myślniki.")
  .min(3, "Adres ma co najmniej 3 znaki.")
  .max(120);

const uuid = z.string().uuid();
const imagePath = (folder: "articles" | "ebooks") =>
  z
    .string()
    .regex(
      new RegExp(`^${folder}/[0-9a-f-]{36}\\.(jpg|png|webp)$`),
      "Nieznany plik.",
    );

/** An address from a title: Polish letters folded, at most 120 characters. */
export function slugFromTitle(title: string): string {
  const slug = headingSlug(title).slice(0, 120).replace(/-+$/g, "");
  return slug === "sekcja" && !title.trim() ? "" : slug;
}

// ------------------------------------------------------------ categories

export const articleCategoryInputSchema = z.strictObject({
  slug: educationSlugSchema,
  name: z.string().trim().min(1, "Wpisz nazwę.").max(80),
  description: z.string().trim().max(300),
  sortOrder: z.number().int().min(0).max(10_000),
});

export type ArticleCategoryInput = z.infer<typeof articleCategoryInputSchema>;

export interface ArticleCategory extends ArticleCategoryInput {
  id: string;
}

// ------------------------------------------------------------ articles

export const ARTICLE_LIMITS_META = {
  title: 160,
  lead: 400,
  coverAlt: 300,
  seoTitle: 70,
  seoDescription: 160,
  sources: 30,
  services: 10,
  specialists: 10,
} as const;

export const articleSourceSchema = z.strictObject({
  title: z.string().trim().min(1, "Wpisz nazwę źródła.").max(300),
  url: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (url) => /^https?:\/\//.test(url) && isSafeRichTextHref(url),
      "Podaj adres zaczynający się od https://",
    ),
});

export type ArticleSource = z.infer<typeof articleSourceSchema>;

export const AUTHOR_KINDS = ["specialist", "team"] as const;
export type AuthorKind = (typeof AUTHOR_KINDS)[number];

/** Who signs an article when it is not a specialist. */
export const TEAM_AUTHOR_NAME = "Zespół Kolor Sensu";

export const articleDraftSchema = z
  .strictObject({
    slug: educationSlugSchema,
    title: z.string().trim().max(ARTICLE_LIMITS_META.title),
    lead: z.string().trim().max(ARTICLE_LIMITS_META.lead),
    coverPath: imagePath("articles").nullable(),
    coverAlt: z.string().trim().max(ARTICLE_LIMITS_META.coverAlt),
    categoryId: uuid.nullable(),
    body: articleDocumentSchema,
    authorKind: z.enum(AUTHOR_KINDS),
    authorSpecialistId: uuid.nullable(),
    reviewerSpecialistId: uuid.nullable(),
    sources: z.array(articleSourceSchema).max(ARTICLE_LIMITS_META.sources),
    serviceIds: z.array(uuid).max(ARTICLE_LIMITS_META.services),
    specialistIds: z.array(uuid).max(ARTICLE_LIMITS_META.specialists),
    ebookId: uuid.nullable(),
    seoTitle: z.string().trim().max(ARTICLE_LIMITS_META.seoTitle),
    seoDescription: z.string().trim().max(ARTICLE_LIMITS_META.seoDescription),
    ogImagePath: imagePath("articles").nullable(),
  })
  // A team article has no specialist author: kept clean, so the published
  // version and the draft compare equal.
  .transform((draft) =>
    draft.authorKind === "team"
      ? { ...draft, authorSpecialistId: null }
      : draft,
  );

export type ArticleDraft = z.infer<typeof articleDraftSchema>;

export function emptyArticleDraft(slug = "nowy-artykul"): ArticleDraft {
  return {
    slug,
    title: "",
    lead: "",
    coverPath: null,
    coverAlt: "",
    categoryId: null,
    body: emptyArticleDocument as ArticleDocument,
    authorKind: "team",
    authorSpecialistId: null,
    reviewerSpecialistId: null,
    sources: [],
    serviceIds: [],
    specialistIds: [],
    ebookId: null,
    seoTitle: "",
    seoDescription: "",
    ogImagePath: null,
  };
}

/** A published article, as the site reads it. */
export interface PublishedArticle {
  id: string;
  slug: string;
  title: string;
  lead: string;
  coverPath: string;
  coverAlt: string;
  categoryId: string;
  body: ArticleDocument;
  authorKind: AuthorKind;
  authorSpecialistId: string | null;
  reviewerSpecialistId: string | null;
  sources: ArticleSource[];
  ebookId: string | null;
  seoTitle: string;
  seoDescription: string;
  ogImagePath: string | null;
  publishedAt: string;
  contentUpdatedAt: string;
}

// ------------------------------------------------------------ e-books

export const EBOOK_LIMITS = {
  title: 160,
  coverAlt: 300,
  shortDescription: 300,
  audience: 600,
  contents: 40,
  contentsItem: 200,
  format: 120,
  seoTitle: 70,
  seoDescription: 160,
} as const;

const VIDEO =
  /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[A-Za-z0-9_-]+/;

export const ebookDraftSchema = z.strictObject({
  slug: educationSlugSchema,
  title: z.string().trim().max(EBOOK_LIMITS.title),
  coverPath: imagePath("ebooks").nullable(),
  coverAlt: z.string().trim().max(EBOOK_LIMITS.coverAlt),
  shortDescription: z.string().trim().max(EBOOK_LIMITS.shortDescription),
  description: richTextDocumentSchema,
  audience: z.string().trim().max(EBOOK_LIMITS.audience),
  contents: z
    .array(z.string().trim().min(1).max(EBOOK_LIMITS.contentsItem))
    .max(EBOOK_LIMITS.contents),
  format: z.string().trim().max(EBOOK_LIMITS.format),
  naffyUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (url) => url === "" || /^https:\/\/[^/\s]+(\/\S*)?$/.test(url),
      "Podaj adres produktu na Naffy, zaczynający się od https://",
    ),
  /** Show the price read from Naffy (else only the way to Naffy). */
  showPrice: z.boolean().default(false),
  videoUrl: z
    .string()
    .trim()
    .max(300)
    .refine(
      (url) => url === "" || VIDEO.test(url),
      "Wklej link do filmu na YouTube albo Vimeo.",
    ),
  samplePath: z
    .string()
    .regex(/^ebooks\/[0-9a-f-]{36}\.pdf$/, "Nieznany plik.")
    .nullable(),
  seoTitle: z.string().trim().max(EBOOK_LIMITS.seoTitle),
  seoDescription: z.string().trim().max(EBOOK_LIMITS.seoDescription),
  ogImagePath: imagePath("ebooks").nullable(),
});

export type EbookDraft = z.infer<typeof ebookDraftSchema>;

export function emptyEbookDraft(slug = "nowy-ebook"): EbookDraft {
  return {
    slug,
    title: "",
    coverPath: null,
    coverAlt: "",
    shortDescription: "",
    description: emptyRichTextDocument as RichTextDocument,
    audience: "",
    contents: [],
    format: "",
    naffyUrl: "",
    showPrice: false,
    videoUrl: "",
    samplePath: null,
    seoTitle: "",
    seoDescription: "",
    ogImagePath: null,
  };
}

/** A published e-book, as the site reads it. */
export interface PublishedEbook {
  id: string;
  slug: string;
  title: string;
  coverPath: string;
  coverAlt: string;
  shortDescription: string;
  description: RichTextDocument;
  audience: string;
  contents: string[];
  format: string;
  naffyUrl: string;
  showPrice: boolean;
  videoUrl: string;
  samplePath: string | null;
  seoTitle: string;
  seoDescription: string;
  ogImagePath: string | null;
  publishedAt: string;
  contentUpdatedAt: string;
}

// ------------------------------------------------------------ admin rows

export type EducationStatus = "draft" | "published";

/** A row of the admin's list (articles or e-books). */
export interface EducationAdminRow<Draft> {
  id: string;
  status: EducationStatus;
  draft: Draft;
  /** The published address (null until first published). */
  slug: string | null;
  publishedAt: string | null;
  updatedAt: string;
  hasUnpublishedChanges: boolean;
}

/** What publishing refused, from the database's message, in Polish. */
export const PUBLISH_PROBLEMS: Record<string, string> = {
  "article_incomplete:title": "Wpisz tytuł artykułu.",
  "article_incomplete:lead": "Wpisz wstęp artykułu.",
  "article_incomplete:cover": "Dodaj okładkę z opisem dla osób niewidomych.",
  "article_incomplete:category": "Wybierz kategorię.",
  "article_incomplete:body": "Napisz treść artykułu.",
  "article_incomplete:author": "Wybierz autora.",
  article_slug_taken: "Ten adres ma już inny artykuł. Zmień adres.",
  article_published: "Najpierw wycofaj artykuł ze strony.",
  category_in_use: "Ta kategoria ma artykuły. Najpierw przenieś je do innej.",
  "ebook_incomplete:title": "Wpisz tytuł e-booka.",
  "ebook_incomplete:cover": "Dodaj okładkę z opisem dla osób niewidomych.",
  "ebook_incomplete:shortDescription": "Wpisz krótki opis.",
  "ebook_incomplete:naffyUrl": "Wklej link do produktu na Naffy.",
  ebook_slug_taken: "Ten adres ma już inny e-book. Zmień adres.",
  ebook_published: "Najpierw wycofaj e-book ze strony.",
};

/** The Polish words for a refusal (the message itself if unknown). */
export function publishProblem(message: string): string | null {
  return PUBLISH_PROBLEMS[message] ?? null;
}
