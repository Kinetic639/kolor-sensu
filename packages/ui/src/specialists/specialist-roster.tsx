import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import { PageLink as Link } from "../public-site/page-link";
import { RosterOpenLink } from "../resource-roster/open-link";
import { RosterItem } from "../resource-roster/roster-item";
import { Roster, RosterEmpty, RosterWeek } from "../resource-roster/roster-bar";
import { LoadMeter, NowLine, WeekStrip } from "../resource-roster/roster-parts";
import { specialistPageHref } from "./page-params";
import {
  SpecialistAvatar,
  stripDays,
  UpcomingVisitTable,
  WeekDayTiles,
} from "./specialist-parts";
import { SpecialistOfferTable } from "./specialist-offers";
import type { OfferStateAction, SpecialistOffer, SpecialistRow } from "./types";

// The centre's team as a roster: a specialist a row with their week as a
// strip, how booked, what they are doing now and what their state tells;
// a click opens them in place on tabs (the week day by day, the next
// visits, the services with their switches). Rendered on the server; only
// the opening, the tabs, the menus and the switches run in the browser.

const BUTTON =
  "inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none [&_svg]:size-3.5";

function Row({
  row,
  offers,
  offerAction,
  visitHref,
}: {
  row: SpecialistRow;
  offers: SpecialistOffer[];
  offerAction?: OfferStateAction;
  visitHref: (visitId: string) => string;
}) {
  const page = (zakladka?: "grafik" | "uslugi" | "profil") =>
    specialistPageHref(row.id, zakladka ? { zakladka } : {});
  return (
    <RosterItem
      actions={
        <>
          <Link className={BUTTON} href={page("grafik")}>
            <CalendarDays aria-hidden="true" />
            Grafik
          </Link>
          <Link className={BUTTON} href={page("profil")}>
            Profil publiczny
          </Link>
          <span className="hidden truncate text-[0.75rem] text-[var(--text-muted)] md:inline">
            {[
              row.since ? `Współpraca ${row.since}` : null,
              `/specjalisci/${row.slug}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <Link
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[var(--primary)] px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:outline-none"
            href={row.href}
          >
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            Otwórz stronę
          </Link>
        </>
      }
      id={row.id}
      identity={
        <span className="flex min-w-0 items-center gap-2.5">
          <SpecialistAvatar row={row} size={34} />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-[0.875rem] font-semibold text-[var(--text)]">
              {row.name}
            </span>
            {row.title ? (
              <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
                {row.title}
              </span>
            ) : null}
          </span>
        </span>
      }
      menu={
        <RosterOpenLink
          href={row.href}
          name={row.name}
          title="Otwórz stronę specjalisty"
        />
      }
      muted={!row.state.active}
      name={row.name}
      summary={
        <>
          <WeekStrip
            className="col-span-full lg:col-span-1"
            days={stripDays(row.days)}
            label={`Tydzień: ${row.name}`}
          />
          <span className="col-start-2 row-start-2 lg:col-start-auto lg:row-start-auto">
            {row.occupancy.availableMinutes || row.occupancy.visitCount ? (
              <LoadMeter occupancy={row.occupancy} />
            ) : (
              <span className="text-[0.8125rem] text-[var(--text-muted)]">
                Bez dyżurów
              </span>
            )}
          </span>
          <span className="col-start-1 row-start-2 min-w-0 lg:col-start-auto lg:row-start-auto">
            <NowLine status={row.now} />
          </span>
        </>
      }
      summaryClassName="grid-cols-[minmax(0,1fr)_7.5rem] lg:grid-cols-[13rem_7.5rem_minmax(9rem,1fr)]"
      tabs={[
        {
          key: "tydzien",
          label: "Tydzień",
          content: <WeekDayTiles days={row.days} />,
        },
        {
          key: "wizyty",
          label: "Najbliższe wizyty",
          count: row.upcoming.length,
          content: (
            <UpcomingVisitTable visitHref={visitHref} visits={row.upcoming} />
          ),
        },
        {
          key: "uslugi",
          label: "Usługi",
          count: offers.length,
          content: (
            // The table starts where the other tabs do.
            <div className="[&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
              <SpecialistOfferTable action={offerAction} offers={offers} />
            </div>
          ),
        },
      ]}
    />
  );
}

export function SpecialistRoster({
  rows,
  offers,
  offerAction,
  visitHref,
  week,
  summary,
  empty,
}: {
  /** The rows shown (searched, in the segment, in order). */
  rows: SpecialistRow[];
  /** Each specialist's offers, by their id. */
  offers: Record<string, SpecialistOffer[]>;
  /** Saves an offer's switches, for a specialist (none: only shown). */
  offerAction?: (specialistId: string) => OfferStateAction;
  visitHref: (visitId: string) => string;
  week: {
    label: string;
    previousHref: string;
    nextHref: string;
    currentHref: string | null;
  };
  /** The team's week in a line, on the right. */
  summary?: ReactNode;
  /** What no row says. */
  empty: string;
}) {
  return (
    <Roster
      label="Specjaliści"
      week={<RosterWeek {...week} summary={summary} />}
    >
      {rows.length ? (
        rows.map((row) => (
          <Row
            key={row.id}
            offerAction={offerAction?.(row.id)}
            offers={offers[row.id] ?? []}
            row={row}
            visitHref={visitHref}
          />
        ))
      ) : (
        <RosterEmpty>{empty}</RosterEmpty>
      )}
    </Roster>
  );
}
