import { updateServiceOfferStateAction } from "@/features/services/actions";
import { loadServicePage } from "@/features/services/loaders";
import { ServiceContent } from "@/features/services/service-content";
import {
  ServiceOffersTab,
  ServiceOverview,
  ServicePageBar,
} from "@/features/services/service-page";
import { ServiceSettings } from "@/features/services/service-settings";
import { siteTeam } from "@/features/services/view-model";
import { DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import {
  loadServicePageParams,
  servicePageTabs,
  sitePrice,
} from "@repo/ui/services";
import { notFound } from "next/navigation";

// A service's page: the bar with what it is and its state, the sections
// as tabs in the address. One read gives the service, its offers and its
// week (the offer's roster's, kept between requests where it can be);
// every tab edits its own part in place.

export default async function ServicePage({
  params,
  searchParams,
}: PageProps<"/oferta/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { zakladka } = loadServicePageParams(query);
  const page = await loadServicePage(id);
  if (!page) notFound();
  const { row, service, rows } = page;
  const offerAction = updateServiceOfferStateAction.bind(null, row.id);

  return (
    <FullBleed>
      <ServicePageBar row={row} rows={rows} tab={zakladka} />
      <DetailTabs
        active={zakladka}
        label="Sekcje usługi"
        tabs={servicePageTabs(row.id, { specjalisci: row.offers.length })}
      />
      {zakladka === "przeglad" ? (
        <ServiceOverview
          offerAction={offerAction}
          row={row}
          siteCount={rows.filter((one) => one.position !== null).length}
        />
      ) : zakladka === "specjalisci" ? (
        <ServiceOffersTab offerAction={offerAction} row={row} />
      ) : zakladka === "tresc" ? (
        <ServiceContent
          description={service.description}
          price={sitePrice(row.offers)}
          row={row}
          team={siteTeam(row.offers)}
        />
      ) : (
        <ServiceSettings row={row} />
      )}
    </FullBleed>
  );
}
