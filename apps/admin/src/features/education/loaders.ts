import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getArticleAdmin,
  getEbookAdmin,
  listArticleCategories,
  listArticlesAdmin,
  listEbooksAdmin,
} from "@repo/supabase/education";
import {
  listServicesAdmin,
  listSpecialistSummariesForAdmin,
} from "@repo/supabase";
import { cache } from "react";
import type { SpecialistOption } from "./view-model";

// Edukacja's data for the portal's pages (the database checks the admin
// role in each function it calls).

export const loadArticles = cache(async () =>
  listArticlesAdmin(await createClient()),
);

export const loadArticle = cache(async (id: string) =>
  getArticleAdmin(await createClient(), id).catch(() => null),
);

export const loadCategories = cache(async () =>
  listArticleCategories(await createClient()),
);

export const loadEbooks = cache(async () =>
  listEbooksAdmin(await createClient()),
);

export const loadEbook = cache(async (id: string) =>
  getEbookAdmin(await createClient(), id).catch(() => null),
);

/** The specialists an article may be signed, reviewed or linked by. */
export const loadSpecialistOptions = cache(
  async (): Promise<SpecialistOption[]> => {
    const specialists = await listSpecialistSummariesForAdmin(
      await createClient(),
    );
    return specialists
      .map((one) => ({
        id: one.id,
        name:
          one.publicDisplayName || `${one.firstName} ${one.lastName}`.trim(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  },
);

/** The services an article may be linked to and its button may book. */
export const loadServiceOptions = cache(async () => {
  const services = await listServicesAdmin(await createClient());
  return services.map((one) => ({
    id: one.id,
    slug: one.slug,
    name: one.name,
  }));
});

/** A title for the header's trail. */
export async function articleTitle(id: string): Promise<string | null> {
  const article = await loadArticle(id);
  return article ? article.draft.title.trim() || "Bez tytułu" : null;
}

export async function ebookTitle(id: string): Promise<string | null> {
  const ebook = await loadEbook(id);
  return ebook ? ebook.draft.title.trim() || "Bez tytułu" : null;
}
