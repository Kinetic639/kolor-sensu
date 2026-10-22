import { Button } from "@repo/ui/button";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { RosterBar } from "@repo/ui/resource-roster";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  VisibilitySwitches,
  WorkshopSearch,
} from "@/features/workshops/list-controls";
import {
  loadWorkshops,
  loadWorkshopVisibility,
} from "@/features/workshops/loaders";
import {
  loadWorkshopListParams,
  workshopListHref,
} from "@/features/workshops/search-params";
import {
  segmentCounts,
  WORKSHOP_SEGMENT_LABELS,
  WORKSHOP_SEGMENTS,
  workshopList,
} from "@/features/workshops/view-model";
import { WorkshopTable } from "@/features/workshops/workshop-table";
import { centreSettings } from "@/lib/reference-data";

// Warsztaty (docs/product/workshops-plan.md, PR 2): every workshop as a
// compact table, edge to edge, in segments (coming, drafts, past,
// cancelled), with its seats and money; "Nowy warsztat" opens an empty
// form; the two switches say whether the site shows Warsztaty in its menu
// and on its homepage. Few workshops, so all are read and filtered here.

export default async function WorkshopsPage({
  searchParams,
}: PageProps<"/warsztaty">) {
  const params = loadWorkshopListParams(await searchParams);
  const [rows, visibility, settings] = await Promise.all([
    loadWorkshops(),
    loadWorkshopVisibility(),
    centreSettings(),
  ]);
  const now = new Date();
  const counts = segmentCounts(rows, now);
  const shown = workshopList(rows, {
    segment: params.stan,
    query: params.q,
    now,
  });

  return (
    <FullBleed>
      <PageTitle>Warsztaty</PageTitle>
      <RosterBar
        action={
          <span className="flex flex-wrap items-center gap-3">
            <VisibilitySwitches visibility={visibility} />
            <Button asChild size="sm">
              <Link href="/warsztaty/nowy">
                <Plus aria-hidden="true" className="size-4" />
                Nowy warsztat
              </Link>
            </Button>
          </span>
        }
        label="Które warsztaty"
        search={<WorkshopSearch />}
        segments={WORKSHOP_SEGMENTS.map((segment) => ({
          key: segment,
          label: WORKSHOP_SEGMENT_LABELS[segment],
          count: counts[segment],
          href: workshopListHref({ ...params, stan: segment }),
          active: params.stan === segment,
        }))}
      />
      <WorkshopTable
        empty={
          rows.length
            ? "Żaden warsztat nie pasuje. Zmień wyszukiwanie albo wybierz „Wszystkie”."
            : "Nie ma jeszcze warsztatów. Dodaj pierwszy: „Nowy warsztat”."
        }
        rows={shown}
        timeZone={settings.timezone}
      />
    </FullBleed>
  );
}
