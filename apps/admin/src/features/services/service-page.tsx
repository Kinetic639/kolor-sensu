import { visitsLabel } from "@repo/scheduling";
import {
  DETAIL_BUTTON,
  DetailBar,
  DetailBody,
  DetailProp,
  DetailProps,
  DetailSection,
  DetailSwitcher,
} from "@repo/ui/detail-page";
import { NowLine } from "@repo/ui/resource-roster";
import {
  durationsLabel,
  priceRange,
  ServiceMark,
  ServiceOfferTable,
  servicePageHref,
  ServiceReadiness,
  serviceReadiness,
  ServiceSiteTile,
  serviceStatus,
  ServiceVisitTable,
  type ServicePageTab,
  type ServiceRow,
} from "@repo/ui/services";
import type { OfferStateAction } from "@repo/ui/specialists";
import { Tag } from "@repo/ui/visit-table";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { publicFonts } from "../specialists/public-fonts";
import { visitHref } from "../specialists/specialist-page";

// A service's page (Oferta → a service), as a room's: one bar with what it
// is and its state, the sections as tabs in the address, the content in
// sections of rows. Rendered on the server; only the switches, the forms
// and the switcher run in the browser.

/** Oferta: the state as tags, beside the name. */
function StateTags({ row }: { row: ServiceRow }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-1">
      <Tag tone={row.active ? "success" : "neutral"}>
        {row.active ? "Aktywna" : "Nieaktywna"}
      </Tag>
      {row.active ? (
        <>
          <Tag tone={row.publiclyVisible ? "info" : "neutral"}>
            {row.publiclyVisible ? "Na stronie" : "Ukryta na stronie"}
          </Tag>
          {row.bookingEnabled ? <Tag tone="info">Rezerwacja online</Tag> : null}
        </>
      ) : null}
    </span>
  );
}

export function ServicePageBar({
  row,
  rows,
  tab,
}: {
  row: ServiceRow;
  /** Every service, for the switcher. */
  rows: ServiceRow[];
  tab: ServicePageTab;
}) {
  return (
    <DetailBar
      actions={<StateTags row={row} />}
      back={{ href: "/oferta", label: "Oferta" }}
      leading={<ServiceMark service={row} size={32} />}
      subtitle={`${row.categoryLabel} · ${row.durationMinutes} min`}
      title={row.name}
      // The name is the way to another service.
      titleControl={
        <DetailSwitcher
          currentId={row.id}
          items={rows.map((one) => ({
            id: one.id,
            name: one.active ? one.name : `${one.name} (nieaktywna)`,
            href: servicePageHref(one.id, { zakladka: tab }),
          }))}
          label="Usługi"
          name={row.name}
          title="Wybierz inną usługę"
        />
      }
    />
  );
}

const tabLink = (row: ServiceRow, zakladka: ServicePageTab, label: string) => (
  <Link
    className={DETAIL_BUTTON}
    href={servicePageHref(row.id, { zakladka }) as Route}
  >
    {label}
  </Link>
);

/** The site's tile and what it still needs: beside the overview. */
function SiteAside({ row, siteCount }: { row: ServiceRow; siteCount: number }) {
  return (
    <>
      <DetailSection
        actions={
          <a
            className={DETAIL_BUTTON}
            href={row.publicUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" />
            Na stronie
          </a>
        }
        note={row.position ? `${row.position}. z ${siteCount}` : "ukryta"}
        title="W ofercie na stronie"
      >
        <ServiceSiteTile className={publicFonts} service={row} />
      </DetailSection>
      <DetailSection title="Gotowość">
        <div className="px-3.5 py-1">
          <ServiceReadiness items={serviceReadiness(row)} />
        </div>
      </DetailSection>
    </>
  );
}

/** Przegląd: what it is, who leads it, the next visits; the site beside. */
export function ServiceOverview({
  row,
  siteCount,
  offerAction,
}: {
  row: ServiceRow;
  /** How many services the site's offer lists. */
  siteCount: number;
  offerAction: OfferStateAction;
}) {
  const price = priceRange(row.offers);
  const next = row.upcoming[0];
  return (
    <DetailBody
      aside={<SiteAside row={row} siteCount={siteCount} />}
      asideLabel="Na stronie"
    >
      <DetailSection
        actions={tabLink(row, "ustawienia", "Zmień")}
        title="Usługa"
      >
        <DetailProps>
          <DetailProp label="Stan">
            <NowLine status={serviceStatus(row)} />
          </DetailProp>
          <DetailProp label="Ceny">
            {price ?? (
              <span className="text-[var(--text-muted)]">
                brak aktywnych ofert
              </span>
            )}
          </DetailProp>
          <DetailProp label="Czas">
            {durationsLabel(row)}
            <span className="text-[var(--text-muted)]">
              {" "}
              · domyślnie {row.durationMinutes} min
            </span>
          </DetailProp>
          <DetailProp label="W tym tygodniu">
            {visitsLabel(row.visitCount)}
            {next ? (
              <span className="text-[var(--text-muted)]">
                {" "}
                · następna {next.dateLabel}, {next.startTime}
              </span>
            ) : null}
          </DetailProp>
          <DetailProp label="Adres na stronie">
            <span className="font-mono text-[0.75rem]">/oferta/{row.slug}</span>
          </DetailProp>
        </DetailProps>
      </DetailSection>
      <DetailSection
        actions={tabLink(row, "specjalisci", "Wszystkie oferty")}
        note={
          row.offers.length
            ? `${row.offers.filter((one) => one.active).length} z ${row.offers.length} aktywnych`
            : undefined
        }
        title="Kto prowadzi"
      >
        <div className="px-3.5 py-2">
          <ServiceOfferTable
            action={offerAction}
            defaultMinutes={row.durationMinutes}
            offers={row.offers}
          />
        </div>
      </DetailSection>
      <DetailSection
        actions={
          <Link
            className={DETAIL_BUTTON}
            href={`/rezerwacje?usluga=${row.id}` as Route}
          >
            W rezerwacjach
          </Link>
        }
        title="Najbliższe wizyty"
      >
        <div className="px-3.5 py-2">
          <ServiceVisitTable visitHref={visitHref} visits={row.upcoming} />
        </div>
      </DetailSection>
    </DetailBody>
  );
}

/** Specjaliści i ceny: every offer, its switches. */
export function ServiceOffersTab({
  row,
  offerAction,
}: {
  row: ServiceRow;
  offerAction: OfferStateAction;
}) {
  return (
    <DetailBody>
      <DetailSection
        note="ceny, czas i formy ustala specjalista w swoim portalu"
        title="Specjaliści i ceny"
      >
        <div className="px-3.5 py-2">
          <ServiceOfferTable
            action={offerAction}
            defaultMinutes={row.durationMinutes}
            offers={row.offers}
          />
        </div>
      </DetailSection>
    </DetailBody>
  );
}
