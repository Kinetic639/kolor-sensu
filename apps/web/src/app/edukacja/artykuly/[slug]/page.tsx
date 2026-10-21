import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArticlePageView, toPeople } from "@/features/education/article-page";
import { articleHref, articleSeo } from "@/features/education/article-view";
import {
  articleImageUrl,
  getArticle,
  getArticleCategories,
  getArticleLinks,
  getArticleRedirect,
  getArticles,
  getEbooks,
} from "@/lib/education-data";
import { baseOpenGraph } from "@/lib/page-metadata";
import {
  getEducationPage,
  getServices,
  getSpecialists,
} from "@/lib/public-data";

// An article (docs/product/education-plan.md, PR 4): prerendered for each
// published one and refreshed when the portal publishes. An old address
// moves to the current one; a draft or a withdrawn article is not found.

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/edukacja/artykuly/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Nie znaleziono artykułu" };
  const seo = articleSeo(article);
  const image = article.ogImagePath ?? (article.coverPath || null);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: articleHref(article.slug) },
    openGraph: {
      ...baseOpenGraph,
      type: "article",
      title: seo.title,
      description: seo.description,
      url: articleHref(article.slug),
      publishedTime: article.publishedAt,
      modifiedTime: article.contentUpdatedAt,
      ...(image && {
        images: [
          {
            url: articleImageUrl(image),
            alt: article.ogImagePath ? article.title : article.coverAlt,
          },
        ],
      }),
    },
  };
}

export default async function ArticlePage({
  params,
}: PageProps<"/edukacja/artykuly/[slug]">) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    const moved = await getArticleRedirect(slug);
    if (moved) permanentRedirect(articleHref(moved));
    notFound();
  }
  const [categories, specialists, services, links, all, words, ebooks] =
    await Promise.all([
      getArticleCategories(),
      getSpecialists(),
      getServices(),
      getArticleLinks(article.id),
      getArticles(),
      getEducationPage(),
      getEbooks(),
    ]);

  return (
    <ArticlePageView
      all={all}
      article={article}
      categories={categories}
      links={links}
      people={toPeople(specialists)}
      services={services}
      therapyNote={words.therapyNote}
      ebook={ebooks.find((one) => one.id === article.ebookId) ?? null}
    />
  );
}
