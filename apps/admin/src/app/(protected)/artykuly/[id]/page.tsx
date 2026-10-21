import { ArticleWorkspace } from "@/features/education/article-workspace";
import {
  loadArticle,
  loadArticles,
  loadCategories,
  loadEbooks,
  loadServiceOptions,
  loadSpecialistOptions,
} from "@/features/education/loaders";
import { untitled } from "@/features/education/view-model";
import { FullBleed } from "@repo/ui/full-bleed";
import { notFound } from "next/navigation";

// An article's page: its draft in one form, saved and published from the
// bar (the workspace).

export default async function ArticlePage({
  params,
}: PageProps<"/artykuly/[id]">) {
  const { id } = await params;
  const [article, rows, categories, specialists, services, ebooks] =
    await Promise.all([
      loadArticle(id),
      loadArticles(),
      loadCategories(),
      loadSpecialistOptions(),
      loadServiceOptions(),
      loadEbooks(),
    ]);
  if (!article) notFound();
  const row = rows.find((one) => one.id === id);

  return (
    <FullBleed>
      <ArticleWorkspace
        categories={categories}
        ebooks={ebooks.map((one) => ({
          id: one.id,
          title: untitled(one.draft.title),
        }))}
        hasUnpublishedChanges={row?.hasUnpublishedChanges ?? false}
        id={id}
        initial={article.draft}
        key={article.updatedAt}
        published={article.status === "published"}
        publishedSlug={article.slug}
        services={services}
        specialists={specialists}
      />
    </FullBleed>
  );
}
