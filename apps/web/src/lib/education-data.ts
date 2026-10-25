import {
  ebookSampleUrl,
  educationImageUrl,
  getEbookSlugRedirect,
  getPublishedEbookBySlug,
  getArticleDraftPreview,
  getEbookDraftPreview,
  getArticleSlugRedirect,
  getPublishedArticleBySlug,
  getPublishedArticleLinks,
  listArticleCategories,
  listPublishedArticles,
  listPublishedEbooks,
} from "@repo/supabase/education";
import { fetchNaffyPrice } from "@repo/app-runtime/naffy-price";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { createSecretClient } from "@/lib/supabase/secret";
import { isPreview } from "./preview";
import { load } from "./public-data";

// Edukacja's reads for the site (docs/architecture/education-domain.md):
// only what is published (the database's rules), never throwing (see
// public-data.ts). The preview of an article's draft reads that one draft
// with the service-role key, and only in Draft Mode.

export const getArticleCategories = cache(() =>
  load("article categories", (client) => listArticleCategories(client), []),
);

/**
 * Every published article, newest first: few, so the pages pick theirs
 * (a category's, an author's, the related ones) from one read.
 */
export const getArticles = cache(() =>
  load("articles", (client) => listPublishedArticles(client), []),
);

/** The articles linked to a service (its page). */
export const getServiceArticles = cache((serviceId: string) =>
  load(
    `articles of service ${serviceId}`,
    (client) => listPublishedArticles(client, { serviceId, limit: 3 }),
    [],
  ),
);

export const getArticle = cache((slug: string) =>
  load(
    `article ${slug}`,
    (client) => getPublishedArticleBySlug(client, slug),
    null,
  ),
);

/** The services and specialists an article recommends. */
export const getArticleLinks = cache((id: string) =>
  load(
    `article links ${id}`,
    (client) => getPublishedArticleLinks(client, id),
    { serviceIds: [], specialistIds: [] },
  ),
);

/** The current address of an article whose address changed, or null. */
export const getArticleRedirect = cache((slug: string) =>
  load(
    `article redirect ${slug}`,
    (client) => getArticleSlugRedirect(client, slug),
    null,
  ),
);

/** An article's draft, in the preview only (else null). */
export const getArticlePreview = cache(async (id: string) => {
  if (!(await isPreview())) return null;
  try {
    return await getArticleDraftPreview(createSecretClient(), id);
  } catch (error) {
    console.error(`[education] preview ${id} failed:`, error);
    return null;
  }
});

/** An e-book's draft, in the preview only (else null; #197). */
export const getEbookPreview = cache(async (id: string) => {
  if (!(await isPreview())) return null;
  try {
    return await getEbookDraftPreview(createSecretClient(), id);
  } catch (error) {
    console.error(`[education] ebook preview ${id} failed:`, error);
    return null;
  }
});

/** Every published e-book, newest first (few: one read). */
export const getEbooks = cache(() =>
  load("ebooks", (client) => listPublishedEbooks(client), []),
);

export const getEbook = cache((slug: string) =>
  load(
    `ebook ${slug}`,
    (client) => getPublishedEbookBySlug(client, slug),
    null,
  ),
);

/** The current address of an e-book whose address changed, or null. */
export const getEbookRedirect = cache((slug: string) =>
  load(
    `ebook redirect ${slug}`,
    (client) => getEbookSlugRedirect(client, slug),
    null,
  ),
);

/**
 * An e-book's price from its page on Naffy (#150), kept for an hour: the
 * price and a promotion change on Naffy, not here. None when unsure.
 */
export const getEbookPrice = cache((naffyUrl: string) =>
  fetchNaffyPrice(naffyUrl, { next: { revalidate: 3600 } }),
);

/** An e-book's free sample, downloaded under a readable name. */
export function ebookSampleHref(path: string, slug: string): string {
  return ebookSampleUrl(createPublicClient(), path, `${slug}-fragment.pdf`);
}

/** An article's or e-book's image address (the public site-media bucket). */
export function articleImageUrl(path: string): string {
  return educationImageUrl(createPublicClient(), path);
}
