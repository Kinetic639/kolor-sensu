import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { toPeople } from "@/features/education/article-page";
import { ArticleListing } from "@/features/education/article-listing";
import { ARTICLES_PATH, headerLead } from "@/features/education/article-view";
import { getArticleCategories, getArticles } from "@/lib/education-data";
import { getEducationPage, getSpecialists } from "@/lib/public-data";

// Every published article, newest first, with the categories to narrow it.

export async function generateMetadata(): Promise<Metadata> {
  const words = await getEducationPage();
  return {
    title: "Artykuły",
    description: headerLead(words.articlesIntro),
    alternates: { canonical: ARTICLES_PATH },
  };
}

export default async function ArticlesPage() {
  const [words, articles, categories, specialists] = await Promise.all([
    getEducationPage(),
    getArticles(),
    getArticleCategories(),
    getSpecialists(),
  ]);

  return (
    <>
      <PageIntro header={words.articlesIntro} />
      <ArticleListing
        all={articles}
        articles={articles}
        categories={categories}
        current={null}
        empty={words.emptyText}
        people={toPeople(specialists)}
      />
    </>
  );
}
