import { ArrowLink, ArticleGrid, SoftCard } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import {
  getClosingCta,
  getEducationPage,
  getSpecialists,
} from "@/lib/public-data";
import { PageIntro } from "@/components/page-intro";
import { educationPage } from "@/content/site";
import { toPeople } from "@/features/education/article-page";
import { ARTICLES_PATH, articleCard } from "@/features/education/article-view";
import {
  articleImageUrl,
  getArticleCategories,
  getArticles,
} from "@/lib/education-data";
import { pageMetadata } from "@/lib/page-metadata";

// Edukacja: what the centre teaches. Its introduction, then the newest
// articles with the way to all of them (e-books join in the next step);
// until the first article is published, a word that the content is coming.

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("education");
}

const LATEST = 3;

export default async function EducationPage() {
  const [closing, words, articles, categories, specialists] = await Promise.all(
    [
      getClosingCta(),
      getEducationPage(),
      getArticles(),
      getArticleCategories(),
      getSpecialists(),
    ],
  );
  const people = toPeople(specialists);

  return (
    <>
      <PageIntro header={words.intro} />
      {articles.length ? (
        <section
          aria-labelledby="najnowsze-artykuly"
          className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              className="font-display text-h2 text-ink"
              id="najnowsze-artykuly"
            >
              {educationPage.latestHeading}
            </h2>
            <ArrowLink href={ARTICLES_PATH}>Wszystkie artykuły</ArrowLink>
          </div>
          <ArticleGrid
            articles={articles.slice(0, LATEST).map((article) => ({
              ...articleCard(article, categories, people),
              coverUrl: article.coverPath
                ? articleImageUrl(article.coverPath)
                : null,
            }))}
            priorityFirst
          />
        </section>
      ) : (
        <section className="max-w-page px-gutter pb-section-sm mx-auto">
          <SoftCard tone="cream" className="grid gap-3 p-6 lg:p-8">
            <h2 className="font-display text-h3 text-ink">
              {educationPage.soonHeading}
            </h2>
            <p className="text-body text-text-muted max-w-copy">
              {words.emptyText}
            </p>
          </SoftCard>
        </section>
      )}
      <ClosingCta words={closing} />
    </>
  );
}
