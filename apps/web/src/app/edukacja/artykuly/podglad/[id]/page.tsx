import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePageView, toPeople } from "@/features/education/article-page";
import {
  getArticleCategories,
  getArticlePreview,
  getArticles,
} from "@/lib/education-data";
import {
  getEducationPage,
  getServices,
  getSpecialists,
} from "@/lib/public-data";

// An article's draft as its page will show it, for the admin who opened
// the preview from the portal (Draft Mode, /api/preview). Anyone else
// finds nothing here; it is never indexed.

export const metadata: Metadata = {
  title: "Podgląd artykułu",
  robots: { index: false, follow: false },
};

export default async function ArticlePreviewPage({
  params,
}: PageProps<"/edukacja/artykuly/podglad/[id]">) {
  const { id } = await params;
  const preview = await getArticlePreview(id);
  if (!preview) notFound();
  const [categories, specialists, services, all, words] = await Promise.all([
    getArticleCategories(),
    getSpecialists(),
    getServices(),
    getArticles(),
    getEducationPage(),
  ]);

  return (
    <ArticlePageView
      all={all}
      article={preview.article}
      categories={categories}
      links={preview}
      people={toPeople(specialists)}
      services={services}
      therapyNote={words.therapyNote}
    />
  );
}
