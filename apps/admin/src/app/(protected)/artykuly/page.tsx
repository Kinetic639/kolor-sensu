import { createArticleAction } from "@/features/education/actions";
import {
  CategoryFilter,
  EducationSearch,
} from "@/features/education/education-search";
import { EducationTable } from "@/features/education/education-table";
import {
  loadArticles,
  loadCategories,
  loadSpecialistOptions,
} from "@/features/education/loaders";
import {
  listHref,
  loadEducationListParams,
} from "@/features/education/search-params";
import {
  articleList,
  EDUCATION_SEGMENTS,
  SEGMENT_LABELS,
  segmentCounts,
} from "@/features/education/view-model";
import { Button } from "@repo/ui/button";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { RosterBar } from "@repo/ui/resource-roster";
import { Plus, Tags } from "lucide-react";
import Link from "next/link";

// Artykuły: Edukacja's articles as a compact table, edge to edge. The
// segments (drafts, published, published with changes), the category and
// the search are in the address; "Nowy artykuł" opens an empty draft and
// "Kategorie" their list. Few articles, so all are read and filtered here.

const PATH = "/artykuly";

export default async function ArticlesPage({
  searchParams,
}: PageProps<"/artykuly">) {
  const params = loadEducationListParams(await searchParams);
  const [rows, categories, specialists] = await Promise.all([
    loadArticles(),
    loadCategories(),
    loadSpecialistOptions(),
  ]);
  const counts = segmentCounts(rows);
  const shown = articleList(rows, categories, specialists, {
    segment: params.stan,
    category: params.kategoria,
    query: params.q,
  });

  return (
    <FullBleed>
      <PageTitle>Artykuły</PageTitle>
      <RosterBar
        action={
          <span className="flex items-center gap-2">
            <CategoryFilter categories={categories} />
            <Button asChild size="sm" variant="outline">
              <Link href="/artykuly/kategorie">
                <Tags aria-hidden="true" className="size-4" />
                Kategorie
              </Link>
            </Button>
            <form action={createArticleAction}>
              <Button size="sm" type="submit">
                <Plus aria-hidden="true" className="size-4" />
                Nowy artykuł
              </Button>
            </form>
          </span>
        }
        label="Które artykuły"
        search={<EducationSearch label="Szukaj artykułu" />}
        segments={EDUCATION_SEGMENTS.map((segment) => ({
          key: segment,
          label: SEGMENT_LABELS[segment],
          count: counts[segment],
          href: listHref(PATH, { ...params, stan: segment }),
          active: params.stan === segment,
        }))}
      />
      <EducationTable
        basePath={PATH}
        caption="Artykuły"
        columns={["Kategoria", "Autor"]}
        empty={
          rows.length
            ? "Żaden artykuł nie pasuje. Zmień wyszukiwanie albo wybierz „Wszystkie”."
            : "Nie ma jeszcze artykułów. Dodaj pierwszy: „Nowy artykuł”."
        }
        rows={shown.map((row) => ({
          ...row,
          cells: [row.category, row.author],
        }))}
      />
    </FullBleed>
  );
}
