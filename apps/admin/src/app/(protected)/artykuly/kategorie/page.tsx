import { CategoryManager } from "@/features/education/category-manager";
import { loadArticles, loadCategories } from "@/features/education/loaders";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// Artykuły → Kategorie: the articles' categories, with how many articles
// each has (drafts included: a category in use cannot be deleted).

export default async function CategoriesPage() {
  const [categories, rows] = await Promise.all([
    loadCategories(),
    loadArticles(),
  ]);
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const id = row.draft.categoryId;
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }

  return (
    <FullBleed>
      <PageTitle>Kategorie artykułów</PageTitle>
      <CategoryManager categories={categories} counts={counts} />
    </FullBleed>
  );
}
