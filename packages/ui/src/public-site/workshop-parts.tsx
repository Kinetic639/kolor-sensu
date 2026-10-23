import { CalendarDays, MapPin, Users } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink } from "./page-link";
import { SoftCard } from "./surfaces";

// Warsztaty (docs/product/workshops-plan.md): a workshop's card (the list,
// the homepage) and the facts beside its page's one H1 (when, where, who
// leads, the price, the seats). Server-safe; the words come ready from the
// site (its dates in the centre's time zone).

/** What the seats say: a few left, none (the waitlist), or nothing. */
export type WorkshopSeatsTone = "few" | "full" | null;

export interface WorkshopCardData {
  id: string;
  href: string;
  title: string;
  description: string | null;
  /** `wtorek, 12 listopada 2030` */
  dateLabel: string;
  /** `17:00–19:00` */
  timeLabel: string;
  /** `Online` or the place. */
  placeLabel: string;
  /** `150 zł` or `Bezpłatnie`. */
  priceLabel: string;
  leaders: string | null;
  coverUrl: string | null;
  coverAlt: string;
  /** `Ostatnie 2 miejsca`, `Brak miejsc`, or null. */
  seatsLabel: string | null;
  seatsTone: WorkshopSeatsTone;
  /** `Odwołany`, `Zakończony`, or null. */
  statusLabel: string | null;
}

const SEATS_TONES = {
  few: "bg-primary-soft text-ink",
  full: "bg-pink-soft text-ink",
} as const;

export function WorkshopCard({
  workshop,
  headingLevel = "h3",
  className,
}: {
  workshop: WorkshopCardData;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const Heading = headingLevel;
  const muted = workshop.statusLabel !== null;
  return (
    <SoftCard asChild interactive>
      <article
        className={cn(
          "group grid content-start gap-4 overflow-hidden",
          className,
        )}
      >
        <div className="bg-cream relative aspect-[16/9] w-full">
          {workshop.coverUrl ? (
            <Image
              alt={workshop.coverAlt}
              className={cn("object-cover", muted && "grayscale-[60%]")}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              src={workshop.coverUrl}
            />
          ) : null}
          {workshop.statusLabel ? (
            <span className="bg-surface text-small text-ink absolute top-3 left-3 rounded-full px-3 py-1 font-semibold">
              {workshop.statusLabel}
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 px-5 pb-5 lg:px-6 lg:pb-6">
          <p className="text-small text-primary-strong font-semibold">
            <time>{workshop.dateLabel}</time> · {workshop.timeLabel}
          </p>
          <Heading className="font-display text-h3 text-ink text-balance">
            <PageLink
              className="focus-visible:outline-ring group-hover:underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-2"
              href={workshop.href}
            >
              {workshop.title}
            </PageLink>
          </Heading>
          {workshop.description ? (
            <p className="text-body text-text-muted line-clamp-3">
              {workshop.description}
            </p>
          ) : null}
          <ul className="text-small text-text-muted grid gap-1">
            <li>{workshop.placeLabel}</li>
            {workshop.leaders ? <li>Prowadzi: {workshop.leaders}</li> : null}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body text-ink font-semibold">
              {workshop.priceLabel}
            </span>
            {workshop.seatsLabel && workshop.seatsTone ? (
              <span
                className={cn(
                  "text-small rounded-full px-3 py-0.5 font-medium",
                  SEATS_TONES[workshop.seatsTone],
                )}
              >
                {workshop.seatsLabel}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </SoftCard>
  );
}

export function WorkshopGrid({
  workshops,
  headingLevel,
}: {
  workshops: readonly WorkshopCardData[];
  headingLevel?: "h2" | "h3";
}) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {workshops.map((workshop) => (
        <li className="grid" key={workshop.id}>
          <WorkshopCard headingLevel={headingLevel} workshop={workshop} />
        </li>
      ))}
    </ul>
  );
}

export interface WorkshopFact {
  icon: "date" | "place" | "people";
  label: string;
  value: ReactNode;
}

const FACT_ICONS = { date: CalendarDays, place: MapPin, people: Users };

/** The workshop's page: when, where, who; a description list. */
export function WorkshopFacts({
  facts,
  className,
}: {
  facts: readonly WorkshopFact[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-4", className)}>
      {facts.map((fact) => {
        const Icon = FACT_ICONS[fact.icon];
        return (
          // dt and dd straight under the group (the list's own rule); the
          // icon inside the term, the value under it, indented as one.
          <div className="grid gap-0.5" key={fact.label}>
            <dt className="text-small text-text-muted flex items-center gap-3">
              <Icon
                aria-hidden="true"
                className="text-primary-strong size-5 shrink-0"
              />
              {fact.label}
            </dt>
            <dd className="text-body text-ink pl-8">{fact.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
