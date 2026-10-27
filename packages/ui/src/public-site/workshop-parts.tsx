import { CalendarDays, MapPin, Sprout, Users } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink } from "./page-link";
import { defaultWatercolorSrc, WatercolorImage } from "./watercolor-image";
import { InkReveal } from "./ink-reveal";
import { CrisisCardFrame } from "./crisis-card-frame";
import { HanddrawnLink } from "./handdrawn-link";
import { HoverPaint } from "./hover-paint";

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
  /** Formatted free and total seats, e.g. `8 z 12`. */
  availabilityLabel?: string | null;
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

// The watercolor stays visible while only the photo paints in above it.
// Without a cover the same backdrop holds a decorative sprout. Both sit
// over a narrower, hand-framed panel with the workshop details, price and
// seat availability. The cover and panel link to the workshop.
//
//   article.ks-wk          positioned root
//   ├── .ks-wk__art        cover (or wash), status label
//   └── .ks-wk__body       the card: time, title (link), description,
//       │                  place and leaders
//       └── .ks-wk__footer price and seats, painted
export function WorkshopCard({
  workshop,
  headingLevel = "h3",
  tone = "blush",
  animatePhoto = true,
  variant = "grid",
  className,
}: {
  workshop: WorkshopCardData;
  headingLevel?: "h2" | "h3";
  /** The wash's paint when there is no cover; a row alternates them. */
  tone?: "blush" | "sage";
  /** Disable when the enclosing story controls the photo's reveal. */
  animatePhoto?: boolean;
  /** Story slides use larger type and horizontal workshop details. */
  variant?: "grid" | "story";
  className?: string;
}) {
  const Heading = headingLevel;
  const muted = workshop.statusLabel !== null;
  return (
    <article
      className={cn("ks-wk group/wk", className)}
      data-muted={muted || undefined}
      data-variant={variant}
    >
      <PageLink
        className="ks-wk__art"
        href={workshop.href}
        aria-label={`Zobacz warsztat: ${workshop.title}`}
        tabIndex={-1}
      >
        <div className="ks-wk__backdrop" aria-hidden="true">
          <Image
            src={defaultWatercolorSrc}
            alt=""
            fill
            sizes="(min-width: 1024px) 34vw, (min-width: 640px) 55vw, calc(117vw - 3rem)"
            loading="eager"
          />
        </div>
        {workshop.coverUrl ? (
          <WatercolorImage
            animationPreset={animatePhoto ? "watercolor-reveal" : "none"}
            watercolorSrc={null}
            alt={workshop.coverAlt}
            imageClassName={cn(muted && "grayscale-[60%]")}
            sizes="(min-width: 1024px) 34vw, (min-width: 640px) 55vw, calc(117vw - 3rem)"
            src={workshop.coverUrl}
          />
        ) : (
          <div aria-hidden="true" className="ks-wk__wash">
            <Sprout strokeWidth={1.4} />
          </div>
        )}
        {workshop.statusLabel ? (
          <span className="ks-wk__status bg-surface text-small text-ink rounded-full px-3 py-1 font-semibold">
            {workshop.statusLabel}
          </span>
        ) : null}
      </PageLink>
      <div className="ks-wk__body" data-tone={tone}>
        <InkReveal className="ks-wk__frame">
          <CrisisCardFrame index={tone === "sage" ? 1 : 0} />
        </InkReveal>
        <div className="ks-wk__surface">
          <p className="ks-wk__schedule text-primary-strong font-semibold">
            <time className="whitespace-nowrap">{workshop.dateLabel}</time>
            <span>{workshop.timeLabel}</span>
          </p>
          <Heading className="ks-wk__heading font-display text-ink text-balance">
            <PageLink
              className="ks-wk__title focus-visible:outline-ring after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-2"
              href={workshop.href}
            >
              <span className="ks-wk__title-label">{workshop.title}</span>
            </PageLink>
          </Heading>
          {workshop.description ? (
            <p className="ks-wk__description text-text-muted line-clamp-3">
              {workshop.description}
            </p>
          ) : null}
          <ul
            className={cn(
              "ks-wk__details text-text-muted",
              variant === "grid" && "text-small",
            )}
          >
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
          <div
            className={cn(
              "ks-wk__footer flex flex-wrap items-center",
              variant === "grid" && "gap-x-3 gap-y-2",
            )}
          >
            <span className="ks-wk__price text-ink font-semibold">
              {workshop.priceLabel}
            </span>
            {workshop.availabilityLabel ? (
              <span
                className={cn(
                  "ks-wk__availability text-ink",
                  variant === "grid" && "text-small",
                )}
              >
                <span>Wolne miejsca</span>
                <strong>{workshop.availabilityLabel}</strong>
              </span>
            ) : null}
            {workshop.seatsLabel && workshop.seatsTone ? (
              <span
                className={cn(
                  "ks-wk__seats text-small rounded-full px-3 py-0.5 font-medium",
                  SEATS_TONES[workshop.seatsTone],
                )}
              >
                {workshop.seatsLabel}
              </span>
            ) : null}
          </div>
          <div className="ks-wk__signup">
            <HoverPaint />
            <HanddrawnLink href={workshop.href}>Szczegóły</HanddrawnLink>
          </div>
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
    <ul className="grid w-full max-w-[60rem] gap-x-16 gap-y-16 lg:grid-cols-2">
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
