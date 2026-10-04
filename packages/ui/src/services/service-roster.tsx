import { ArrowUpRight, FolderOpen, PenLine, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { PageLink as Link } from "../public-site/page-link";
import { RosterOpenLink } from "../resource-roster/open-link";
import { Roster, RosterEmpty, RosterWeek } from "../resource-roster/roster-bar";
import { RosterItem, type RosterTab } from "../resource-roster/roster-item";
import { NowLine } from "../resource-roster/roster-parts";
import type { OfferStateAction } from "../specialists/types";
import { servicePageHref } from "./page-params";
import { serviceReadiness, serviceStatus } from "./params";
import {
  OfferAvatars,
  ServiceMark,
  ServiceOfferTable,
  ServicePrice,
  ServiceReadiness,
  ServiceSiteTile,
  ServiceVisitTable,
  ServiceWeekBars,
} from "./service-parts";
import type { ServiceRow } from "./types";

// The centre's offer as a roster: a service a row with who leads it,
// its prices, where it is seen (or what keeps clients from it) and its
// week's visits; a click opens it in place on tabs (the specialists and
// their prices, the next visits, its tile on the site). Rendered on the
// server.

const BUTTON =
  "inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none [&_svg]:size-3.5";

function SitePane({
  service,
  siteClassName,
}: {
  service: ServiceRow;
  siteClassName?: string;
}) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
      <ServiceSiteTile
        className={`rounded-[6px] ${siteClassName ?? ""}`}
        service={service}
      />
      <div className="grid min-w-0 gap-2">
        <dl className="grid text-[0.8125rem]">
          {[
            [
              "Adres",
              <span className="font-mono text-[0.75rem]" key="a">
                /oferta/{service.slug}
              </span>,
            ],
            [
              "Kolejność",
              service.position ? (
                `${service.position}. w ofercie na stronie`
              ) : (
                <span className="text-[var(--text-muted)]" key="k">
                  nie ma jej na stronie
                </span>
              ),
            ],
            [
              "Rezerwacja online",
              service.active && service.bookingEnabled ? (
                "włączona"
              ) : (
                <span className="text-[var(--text-muted)]" key="r">
                  wyłączona
                </span>
              ),
            ],
          ].map(([label, value]) => (
            <div
              className="grid min-h-8 grid-cols-[9rem_minmax(0,1fr)] items-center gap-3 border-b border-[var(--border)] last:border-b-0"
              key={String(label)}
            >
              <dt className="text-[var(--text-muted)]">{label}</dt>
              <dd className="min-w-0 truncate">{value}</dd>
            </div>
          ))}
        </dl>
        <ServiceReadiness items={serviceReadiness(service)} />
      </div>
    </div>
  );
}

function Row({
  service,
  max,
  offerAction,
  visitHref,
  siteClassName,
}: {
  service: ServiceRow;
  max: number;
  offerAction?: OfferStateAction;
  visitHref: (visitId: string) => string;
  siteClassName?: string;
}) {
  const tabs: RosterTab[] = [
    {
      key: "specjalisci",
      label: "Specjaliści i ceny",
      count: service.offers.length,
      content: (
        <ServiceOfferTable
          action={offerAction}
          defaultMinutes={service.durationMinutes}
          offers={service.offers}
        />
      ),
    },
    {
      key: "wizyty",
      label: "Najbliższe wizyty",
      count: service.upcoming.length,
      content: (
        <ServiceVisitTable visitHref={visitHref} visits={service.upcoming} />
      ),
    },
    {
      key: "strona",
      label: "Na stronie",
      content: <SitePane service={service} siteClassName={siteClassName} />,
    },
  ];
  return (
    <RosterItem
      actions={
        <>
          <Link
            className={BUTTON}
            href={servicePageHref(service.id, { zakladka: "tresc" })}
          >
            <PenLine aria-hidden="true" />
            Treść na stronie
          </Link>
          <Link
            className={BUTTON}
            href={servicePageHref(service.id, { zakladka: "ustawienia" })}
          >
            <Settings2 aria-hidden="true" />
            Ustawienia
          </Link>
          <span className="hidden truncate font-mono text-[0.75rem] text-[var(--text-muted)] md:inline">
            /oferta/{service.slug}
          </span>
          <Link
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[var(--primary)] px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:outline-none"
            href={service.href}
          >
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            Otwórz stronę
          </Link>
        </>
      }
      id={service.id}
      identity={
        <span className="flex min-w-0 items-center gap-2.5">
          <ServiceMark service={service} />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-[0.875rem] font-semibold text-[var(--text)]">
              {service.name}
            </span>
            <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
              {service.categoryLabel} · {service.durationMinutes} min
            </span>
          </span>
        </span>
      }
      menu={
        <RosterOpenLink
          href={service.href}
          name={service.name}
          title="Otwórz stronę usługi"
        />
      }
      muted={!service.active}
      name={service.name}
      summary={
        <>
          <span className="min-w-0">
            <OfferAvatars offers={service.offers} />
          </span>
          <ServicePrice service={service} />
          <span className="col-span-full min-w-0 lg:col-span-1">
            <NowLine status={serviceStatus(service)} />
          </span>
          <span className="hidden min-w-0 lg:block">
            <ServiceWeekBars
              days={service.days}
              max={max}
              visitCount={service.visitCount}
            />
          </span>
        </>
      }
      summaryClassName="grid-cols-[minmax(0,1fr)_7rem] lg:grid-cols-[6.5rem_7rem_minmax(12rem,1fr)_8rem]"
      tabs={tabs}
      wideIdentity
    />
  );
}

export function ServiceRoster({
  rows,
  week,
  summary,
  empty,
  offerAction,
  visitHref,
  siteClassName,
  grouped = false,
}: {
  /** The services shown (searched, in the segment, in order). */
  rows: ServiceRow[];
  week: {
    label: string;
    previousHref: string;
    nextHref: string;
    currentHref: string | null;
  };
  /** The offer's week in a line, on the right. */
  summary?: ReactNode;
  /** What no row says. */
  empty: string;
  /** Switches a service's offers (none: the states as words). */
  offerAction?: (serviceId: string) => OfferStateAction;
  /** Where a visit opens. */
  visitHref: (visitId: string) => string;
  /** The site's fonts, for its tile. */
  siteClassName?: string;
  /** In the offer's order: each catalogue's services together, named. */
  grouped?: boolean;
}) {
  // One scale for every row's bars: the busiest day shown.
  const max = Math.max(
    1,
    ...rows.flatMap((service) => service.days.map((day) => day.count)),
  );
  const row = (service: ServiceRow) => (
    <Row
      key={service.id}
      max={max}
      offerAction={offerAction?.(service.id)}
      service={service}
      siteClassName={siteClassName}
      visitHref={visitHref}
    />
  );
  return (
    <Roster label="Usługi" week={<RosterWeek {...week} summary={summary} />}>
      {!rows.length ? (
        <RosterEmpty>{empty}</RosterEmpty>
      ) : grouped ? (
        catalogBlocks(rows).map((block) =>
          block.catalog ? (
            <CatalogBlock
              catalog={block.catalog}
              count={block.rows.length}
              key={`catalog:${block.catalog.id}`}
            >
              {block.rows.map(row)}
            </CatalogBlock>
          ) : (
            block.rows.map(row)
          ),
        )
      ) : (
        rows.map(row)
      )}
    </Roster>
  );
}

/** `1 usługa`, `3 usługi`, `5 usług`. */
export function servicesLabel(count: number) {
  if (count === 1) return "1 usługa";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return `${count} ${few ? "usługi" : "usług"}`;
}

/** The rows in runs: those outside a catalogue, and each catalogue's. */
function catalogBlocks(rows: ServiceRow[]) {
  const blocks: { catalog: ServiceRow["catalog"]; rows: ServiceRow[] }[] = [];
  for (const service of rows) {
    const last = blocks.at(-1);
    if (last && last.catalog?.id === service.catalog?.id) {
      last.rows.push(service);
    } else {
      blocks.push({ catalog: service.catalog, rows: [service] });
    }
  }
  return blocks;
}

/** A catalogue as the site's menu has it: its name, its services under it. */
function CatalogBlock({
  catalog,
  count,
  children,
}: {
  catalog: NonNullable<ServiceRow["catalog"]>;
  count: number;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={`Katalog: ${catalog.name}`}
      className="grid gap-2 border-l-2 border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] pl-2.5"
    >
      <h2 className="flex items-center gap-1.5 px-0.5 pt-1 text-[0.75rem] text-[var(--text-muted)]">
        <FolderOpen aria-hidden="true" className="size-3.5" />
        Katalog{" "}
        <span className="font-semibold text-[var(--text)]">
          {catalog.name}
        </span>{" "}
        <span>· {servicesLabel(count)}</span>
      </h2>
      {children}
    </section>
  );
}
