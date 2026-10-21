import type {
  ArticleCategory,
  PublishedArticle,
} from "@repo/contracts/education";
import { ArticleGrid } from "@repo/ui/public-site";
import Link from "next/link";
import { articleImageUrl } from "@/lib/education-data";
import {
  ARTICLES_PATH,
  articleCard,
  categoryHref,
  usedCategories,
  type ArticlePerson,
} from "./article-view";

// The articles' list (all, or a category's): the categories as links (the
// current one marked) and the cards. Server-rendered; every filter is an
// address of its own, so it is shared and indexed.

const CHIP =
  "text-small inline-flex h-9 items-center rounded-full border px-4 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2";

export function ArticleListing({
  articles,
  all,
  categories,
  people,
  current,
  empty,
}: {
  /** The articles shown. */
  articles: readonly PublishedArticle[];
  /** Every published article: which categories have any. */
  all: readonly PublishedArticle[];
  categories: readonly ArticleCategory[];
  people: readonly ArticlePerson[];
  /** The category shown; none: all. */
  current: ArticleCategory | null;
  empty: string;
}) {
  const used = usedCategories(categories, all);
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8">
      {used.length > 1 ? (
        <nav aria-label="Kategorie artykułów">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                aria-current={current ? undefined : "page"}
                className={chip(!current)}
                href={ARTICLES_PATH}
              >
                Wszystkie
              </Link>
            </li>
            {used.map((category) => (
              <li key={category.id}>
                <Link
                  aria-current={
                    current?.id === category.id ? "page" : undefined
                  }
                  className={chip(current?.id === category.id)}
                  href={categoryHref(category.slug)}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {articles.length ? (
        <ArticleGrid
          articles={articles.map((article) => ({
            ...articleCard(article, categories, people),
            coverUrl: article.coverPath
              ? articleImageUrl(article.coverPath)
              : null,
          }))}
          headingLevel="h2"
          priorityFirst
        />
      ) : (
        <p className="text-body text-text-muted">{empty}</p>
      )}
    </div>
  );
}

function chip(active: boolean) {
  return `${CHIP} ${
    active
      ? "bg-ink text-surface border-ink"
      : "border-border text-ink hover:bg-cream"
  }`;
}
