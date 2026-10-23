import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { toPeople } from "@/features/education/article-page";
import { ArticleListing } from "@/features/education/article-listing";
import {
  categoryHref,
  headerLead,
  usedCategories,
} from "@/features/education/article-view";
import { getArticleCategories, getArticles } from "@/lib/education-data";
import { getEducationPage, getSpecialists } from "@/lib/public-data";

// A category's articles: its name and description over the same list,
// the category marked. A category without published articles is not found
// (an empty page is not worth an address).

export async function generateStaticParams() {
  const [categories, articles] = await Promise.all([
    getArticleCategories(),
    getArticles(),
  ]);
  return usedCategories(categories, articles).map((one) => ({
    slug: one.slug,
  }));
}

async function load(slug: string) {
  const [categories, articles] = await Promise.all([
    getArticleCategories(),
    getArticles(),
  ]);
  const category = categories.find((one) => one.slug === slug);
  const shown = category
    ? articles.filter((one) => one.categoryId === category.id)
    : [];
  return { category, categories, articles, shown };
}

export async function generateMetadata({
  params,
}: PageProps<"/edukacja/artykuly/kategoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await load(slug);
  if (!category) return { title: "Nie znaleziono kategorii" };
  return {
    title: `${category.name} · Artykuły`,
    description:
      category.description ||
      headerLead((await getEducationPage()).articlesIntro),
    alternates: { canonical: categoryHref(category.slug) },
  };
}

export default async function CategoryPage({
  params,
}: PageProps<"/edukacja/artykuly/kategoria/[slug]">) {
  const { slug } = await params;
  const [{ category, categories, articles, shown }, specialists, words] =
    await Promise.all([load(slug), getSpecialists(), getEducationPage()]);
  if (!category || shown.length === 0) notFound();

  return (
    <>
      <PageIntro
        eyebrow="Artykuły"
        heading={category.name}
        lead={category.description || undefined}
      />
      <ArticleListing
        all={articles}
        articles={shown}
        categories={categories}
        current={category}
        empty={words.emptyText}
        people={toPeople(specialists)}
      />
    </>
  );
}
