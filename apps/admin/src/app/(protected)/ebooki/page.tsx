import { createEbookAction } from "@/features/education/actions";
import { EducationSearch } from "@/features/education/education-search";
import { EducationTable } from "@/features/education/education-table";
import { loadEbooks } from "@/features/education/loaders";
import {
  listHref,
  loadEducationListParams,
} from "@/features/education/search-params";
import {
  EDUCATION_SEGMENTS,
  ebookList,
  SEGMENT_LABELS,
  segmentCounts,
} from "@/features/education/view-model";
import { Button } from "@repo/ui/button";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { RosterBar } from "@repo/ui/resource-roster";
import { Plus } from "lucide-react";

// E-booki: Edukacja's e-books as a compact table, edge to edge, with the
// segments and the search in the address; "Nowy e-book" opens an empty
// draft. The sale itself happens on Naffy.

const PATH = "/ebooki";

export default async function EbooksPage({
  searchParams,
}: PageProps<"/ebooki">) {
  const params = loadEducationListParams(await searchParams);
  const rows = await loadEbooks();
  const counts = segmentCounts(rows);
  const shown = ebookList(rows, { segment: params.stan, query: params.q });

  return (
    <FullBleed>
      <PageTitle>E-booki</PageTitle>
      <RosterBar
        action={
          <form action={createEbookAction}>
            <Button size="sm" type="submit">
              <Plus aria-hidden="true" className="size-4" />
              Nowy e-book
            </Button>
          </form>
        }
        label="Które e-booki"
        search={<EducationSearch label="Szukaj e-booka" />}
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
        caption="E-booki"
        columns={[]}
        empty={
          rows.length
            ? "Żaden e-book nie pasuje. Zmień wyszukiwanie albo wybierz „Wszystkie”."
            : "Nie ma jeszcze e-booków. Dodaj pierwszy: „Nowy e-book”."
        }
        rows={shown.map((row) => ({ ...row, cells: [] }))}
      />
    </FullBleed>
  );
}
