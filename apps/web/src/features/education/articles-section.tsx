import type {
  ArticleCategory,
  PublishedArticle,
} from "@repo/contracts/education";
import { ArrowLink, ArticleGrid } from "@repo/ui/public-site";
import { articleImageUrl } from "@/lib/education-data";
import { ARTICLES_PATH, articleCard, type ArticlePerson } from "./article-view";

// A few articles under another page's content (a specialist's, a
// service's), with the way to all of them; nothing when there are none.

export function ArticlesSection({
  id,
  heading,
  articles,
  categories,
  people,
}: {
  id: string;
  heading: string;
  articles: readonly PublishedArticle[];
  categories: readonly ArticleCategory[];
  people: readonly ArticlePerson[];
}) {
  if (articles.length === 0) return null;
  return (
    <section
      aria-labelledby={id}
      className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-h2 text-ink" id={id}>
          {heading}
        </h2>
        <ArrowLink href={ARTICLES_PATH}>Wszystkie artykuły</ArrowLink>
      </div>
      <ArticleGrid
        articles={articles.slice(0, 3).map((article) => ({
          ...articleCard(article, categories, people),
          coverUrl: article.coverPath
            ? articleImageUrl(article.coverPath)
            : null,
        }))}
      />
    </section>
  );
}
