import { updateServiceOfferStateAction } from "@/features/services/actions";
import { ArrangeOfferButton } from "@/features/services/arrange-offer";
import { loadServicesRoster } from "@/features/services/loaders";
import { NewServiceButton } from "@/features/services/new-service-button";
import { publicFonts } from "@/features/specialists/public-fonts";
import { visitHref } from "@/features/specialists/specialist-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { RosterBar, SortMenu } from "@repo/ui/resource-roster";
import {
  loadServiceListParams,
  serviceSegments,
  servicesWeekSummary,
  serviceSortOptions,
  serviceWeekNav,
  ServiceRoster,
  ServiceSearch,
  shownServices,
} from "@repo/ui/services";

// Oferta: the centre's services as a roster, edge to edge. A row each with
// who leads it, its prices, whether it is on and seen on the site (or what
// keeps clients away) and its week's visits; a click opens it in place on
// tabs (the specialists and their prices, the next visits, its tile on
// the site). In the offer's order each catalogue's services come together,
// as the site's menu has them; "Kolejność i katalogi" arranges it all. A
// few services, so all are read at once and searched, filtered and sorted
// here; the address holds it all, the rows open included.

const PATH = "/oferta";

export default async function OfferPage({
  searchParams,
}: PageProps<"/oferta">) {
  const params = loadServiceListParams(await searchParams);
  const { rows, catalogs, week, thisWeek } = await loadServicesRoster(
    params.tydzien,
  );

  return (
    <FullBleed>
      <PageTitle>Oferta</PageTitle>
      <RosterBar
        action={
          <span className="flex items-center gap-2">
            <ArrangeOfferButton catalogs={catalogs} rows={rows} />
            <NewServiceButton />
          </span>
        }
        label="Które usługi"
        search={<ServiceSearch />}
        segments={serviceSegments(PATH, params, rows)}
        sort={<SortMenu options={serviceSortOptions(PATH, params)} />}
      />
      <ServiceRoster
        empty={
          rows.length
            ? "Żadna usługa nie pasuje do wyszukiwania. Zmień je albo wybierz „Wszystkie”."
            : "Katalog usług jest pusty. Dodaj pierwszą usługę centrum."
        }
        grouped={params.sort === "kolejnosc"}
        offerAction={(id) => updateServiceOfferStateAction.bind(null, id)}
        rows={shownServices(rows, params)}
        siteClassName={publicFonts}
        summary={servicesWeekSummary(rows)}
        visitHref={visitHref}
        week={serviceWeekNav(PATH, params, { week, thisWeek })}
      />
    </FullBleed>
  );
}
