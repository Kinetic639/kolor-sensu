import { updateSpecialistOfferStateAction } from "@/features/specialists/actions";
import { loadSpecialists } from "@/features/specialists/loaders";
import { visitHref } from "@/features/specialists/specialist-page";
import { teamWeekSummary } from "@/features/specialists/view-model";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { RosterBar, SortMenu } from "@repo/ui/resource-roster";
import {
  loadSpecialistListParams,
  shownSpecialists,
  SpecialistRoster,
  SpecialistSearch,
  specialistSegments,
  specialistSortOptions,
  specialistWeekNav,
} from "@repo/ui/specialists";

// Specjaliści: the centre's team as a roster, edge to edge. A row each
// with the week as a strip, how booked, what they are doing now; a click
// opens them in place on tabs (the week, the next visits, the services).
// A handful of people, so everyone is read at once (with the week and
// the offers) and searched, filtered and sorted here; the address holds
// it all, the rows open included.

const PATH = "/specjalisci";

export default async function SpecialistsPage({
  searchParams,
}: PageProps<"/specjalisci">) {
  const params = loadSpecialistListParams(await searchParams);
  const { rows, offers, week, thisWeek } = await loadSpecialists(
    params.tydzien,
  );
  const shown = shownSpecialists(rows, params);

  return (
    <FullBleed>
      <PageTitle>Specjaliści</PageTitle>
      <RosterBar
        label="Którzy specjaliści"
        search={<SpecialistSearch />}
        segments={specialistSegments(PATH, params, rows)}
        sort={<SortMenu options={specialistSortOptions(PATH, params)} />}
      />
      <SpecialistRoster
        empty={
          rows.length
            ? "Nikt nie pasuje do wyszukiwania. Zmień je albo wybierz „Wszyscy”."
            : "W centrum nie ma jeszcze specjalistów."
        }
        offerAction={(id) => updateSpecialistOfferStateAction.bind(null, id)}
        offers={offers}
        rows={shown}
        summary={teamWeekSummary(rows.filter((row) => row.state.active))}
        visitHref={visitHref}
        week={specialistWeekNav(PATH, params, { week, thisWeek })}
      />
    </FullBleed>
  );
}
