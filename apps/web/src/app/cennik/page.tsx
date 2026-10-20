import type { PricesPageContent } from "@repo/contracts";
import { ArrowLink, EditorialHeading, SoftCard } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import {
  formatDuration,
  formatPrice,
  offerModes,
  specialistHref,
} from "@/lib/presentation";
import {
  getBookingWindow,
  getClosingCta,
  getOffer,
  getPriceList,
  getPricesPage,
  getSpecialists,
  type PublicOffer,
  type PublicService,
} from "@/lib/public-data";
import { serviceHref, serviceTitle } from "@/lib/site-frame";
import { pageMetadata } from "@/lib/page-metadata";
import { catalogAnchor } from "@repo/contracts";
import { offerBlocks } from "../oferta/offer-blocks";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("prices");
}

type SpecialistName = (slug: string) => string | undefined;

interface CardProps {
  headingLevel: "h2" | "h3";
  name: SpecialistName;
  /** Each service's offers, by its slug. */
  offersOf: (slug: string) => PublicOffer[];
  noPriceText: string;
}

/** One service's card: its specialists' prices, or the agreed-price line. */
function PriceCard({
  service,
  headingLevel,
  name,
  offersOf,
  noPriceText,
}: CardProps & { service: PublicService }) {
  const rows = offersOf(service.slug).flatMap((offer) => {
    const specialist = name(offer.specialistPublicSlug);
    return specialist ? [{ offer, specialist }] : [];
  });
  const Heading = headingLevel;
  return (
    <SoftCard className="grid content-start gap-4 p-6 lg:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading className="font-display text-h3 text-ink">
          {serviceTitle(service)}
        </Heading>
        <span className="text-small text-text-muted">
          {formatDuration(service.defaultDurationMinutes)}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-small text-text-muted">{noPriceText}</p>
      ) : (
        <table className="text-small w-full">
          <caption className="sr-only">
            {`Ceny: ${serviceTitle(service)}`}
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Specjalista</th>
              <th scope="col">Szczegóły</th>
              <th scope="col">Cena</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map(({ offer, specialist }) => (
              <tr key={offer.specialistPublicSlug}>
                <th scope="row" className="py-3 pr-4 text-left font-semibold">
                  <Link
                    href={specialistHref(offer.specialistPublicSlug) as Route}
                    className="hover:text-primary-strong underline-offset-4 hover:underline"
                  >
                    {specialist}
                  </Link>
                </th>
                <td className="text-text-muted py-3 pr-4">
                  {[
                    formatDuration(offer.effectiveDurationMinutes),
                    offerModes(offer),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <td className="text-ink py-3 text-right font-semibold whitespace-nowrap">
                  {formatPrice(offer)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ArrowLink
        href={serviceHref(service.slug) as Route}
        className="justify-self-start"
      >
        Więcej o usłudze
      </ArrowLink>
    </SoftCard>
  );
}

function Cards(props: CardProps & { services: PublicService[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {props.services.map((service) => (
        <PriceCard key={service.id} {...props} service={service} />
      ))}
    </div>
  );
}

/**
 * Payment and cancelling: how long before a visit it is cancelled free
 * (the centre's settings, as booking applies it), then the CMS's rules.
 */
function Rules({
  words,
  freeCancellationHours,
}: {
  words: PricesPageContent;
  freeCancellationHours: number | null;
}) {
  if (words.rules.length === 0 && freeCancellationHours === null) return null;
  return (
    <section
      aria-labelledby="zasady-heading"
      className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6"
      id="zasady"
    >
      <EditorialHeading as="h2" id="zasady-heading" size="h3">
        {words.rulesHeading}
      </EditorialHeading>
      <dl className="max-w-copy grid gap-5">
        {freeCancellationHours !== null ? (
          <div className="grid gap-1">
            <dt className="text-ink font-semibold">Odwołanie wizyty</dt>
            <dd className="text-text-muted">
              {`Wizytę odwołasz z pełnym zwrotem opłaty najpóźniej ${freeCancellationHours} godz. przed jej początkiem.`}
            </dd>
          </div>
        ) : null}
        {words.rules.map((rule) => (
          <div className="grid gap-1" key={rule.title}>
            <dt className="text-ink font-semibold">{rule.title}</dt>
            <dd className="text-text-muted">{rule.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function PricesPage() {
  const [offer, priceList, specialists, words, window, closing] =
    await Promise.all([
      getOffer(),
      getPriceList(),
      getSpecialists(),
      getPricesPage(),
      getBookingWindow(),
      getClosingCta(),
    ]);
  const name: SpecialistName = (slug) =>
    specialists.find((one) => one.publicSlug === slug)?.displayName;
  // In the offer's catalogues and order.
  const blocks = offerBlocks(offer);
  const offers = new Map(
    priceList.map((one) => [one.service.slug, one.offers]),
  );
  const card = {
    name,
    offersOf: (slug: string) => offers.get(slug) ?? [],
    noPriceText: words.noPriceText,
  };

  return (
    <>
      <PageIntro {...words.intro} />
      <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-14">
        {blocks.length === 0 ? (
          <p className="text-body text-text-muted max-w-copy">
            {words.emptyText}
          </p>
        ) : (
          blocks.map((block) =>
            block.catalog ? (
              <section
                aria-labelledby={`${catalogAnchor(block.catalog.name)}-ceny`}
                className="grid gap-6"
                key={block.catalog.id}
              >
                <EditorialHeading
                  as="h2"
                  id={`${catalogAnchor(block.catalog.name)}-ceny`}
                  size="h3"
                >
                  {block.catalog.name}
                </EditorialHeading>
                <Cards {...card} headingLevel="h3" services={block.services} />
              </section>
            ) : (
              <Cards
                {...card}
                headingLevel="h2"
                key={block.services[0]!.id}
                services={block.services}
              />
            ),
          )
        )}
      </div>
      <Rules
        freeCancellationHours={window?.cancellationWindowHours ?? null}
        words={words}
      />
      <ClosingCta words={closing} />
    </>
  );
}
