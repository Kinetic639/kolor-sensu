import { ArrowRight, CalendarDays, MapPin, Sprout, Users } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink } from "./page-link";
import { WatercolorImage } from "./watercolor-image";

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

// On the card's tinted footer: paper chips, the full one in pink.
const SEATS_TONES = {
  few: "bg-surface text-ink",
  full: "bg-surface text-pink-strong",
} as const;

// The cover as a painted photo (WatercolorImage: dry-brush edge,
// watercolor behind), or a painted wash in the same shape when there is
// none, with the date on a flat pill of paint, circled by hand, over its
// lower corner; it
// lies over the top of a quiet card, narrower than the cover, that holds
// the words, its price and "Zapisz się" on a tinted footer. The whole card
// is the title link's click area.
//
//   article.ks-wk          positioned root
//   ├── .ks-wk__art        cover (or wash), status label
//   └── .ks-wk__body       the card: time, title (link), description,
//       │                  place and leaders
//       └── .ks-wk__footer price, seats, "Zapisz się", tinted
export function WorkshopCard({
  workshop,
  headingLevel = "h3",
  tone = "blush",
  className,
}: {
  workshop: WorkshopCardData;
  headingLevel?: "h2" | "h3";
  /** The wash's paint when there is no cover; a row alternates them. */
  tone?: "blush" | "sage";
  className?: string;
}) {
  const Heading = headingLevel;
  const muted = workshop.statusLabel !== null;
  return (
    <article
      className={cn("ks-wk group/wk", className)}
      data-muted={muted || undefined}
    >
      <div className="ks-wk__art">
        {workshop.coverUrl ? (
          <WatercolorImage
            alt={workshop.coverAlt}
            imageClassName={cn(muted && "grayscale-[60%]")}
            sizes="(min-width: 1024px) 34vw, (min-width: 640px) 55vw, calc(117vw - 3rem)"
            src={workshop.coverUrl}
          />
        ) : (
          <div aria-hidden="true" className="ks-wk__wash">
            <span
              className="ks-wk__wash-paint ks-areas__paint"
              data-paint={tone}
            />
            <Sprout strokeWidth={1.4} />
          </div>
        )}
        {workshop.statusLabel ? (
          <span className="ks-wk__status bg-surface text-small text-ink rounded-full px-3 py-1 font-semibold">
            {workshop.statusLabel}
          </span>
        ) : null}
      </div>
      <div className="ks-wk__body">
        <p className="text-small text-primary-strong grid gap-0.5 font-semibold">
          <time className="whitespace-nowrap">{workshop.dateLabel}</time>
          <span>{workshop.timeLabel}</span>
        </p>
        <Heading className="font-display text-h3 text-ink text-balance">
          <PageLink
            className="focus-visible:outline-ring decoration-pink underline-offset-4 group-hover/wk:underline after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-2"
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
        <ul className="text-small text-text-muted grid gap-1.5">
          <li className="flex items-start gap-2">
            <MapPin
              aria-hidden="true"
              className="text-primary mt-0.5 size-4 shrink-0"
              strokeWidth={1.6}
            />
            <span>{workshop.placeLabel}</span>
          </li>
          {workshop.leaders ? (
            <li className="flex items-start gap-2">
              <Users
                aria-hidden="true"
                className="text-primary mt-0.5 size-4 shrink-0"
                strokeWidth={1.6}
              />
              <span>Prowadzi: {workshop.leaders}</span>
            </li>
          ) : null}
        </ul>
        <div className="ks-wk__footer flex flex-wrap items-center gap-x-3 gap-y-2">
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
          {muted ? null : (
            <span
              aria-hidden="true"
              className="text-small text-ink ml-auto inline-flex items-center gap-1.5 font-semibold"
            >
              Zapisz się
              <ArrowRight
                className="ease-soft size-4 transition-transform duration-200 group-hover/wk:translate-x-0.5"
                strokeWidth={1.75}
              />
            </span>
          )}
        </div>
      </div>
    </article>
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
    <ul className="grid gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
      {workshops.map((workshop, index) => (
        <li className="grid" key={workshop.id}>
          <WorkshopCard
            headingLevel={headingLevel}
            tone={index % 2 ? "sage" : "blush"}
            workshop={workshop}
          />
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
