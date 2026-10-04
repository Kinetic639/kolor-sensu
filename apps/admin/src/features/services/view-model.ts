import {
  arrangeOffer,
  flattenOffer,
  type Service,
  type ServiceCatalog,
  type ServiceCategory,
  type SpecialistService,
} from "@repo/contracts";
import {
  addDays,
  WEEKDAY_ABBR,
  type ServiceDay,
  type ServiceWeek,
} from "@repo/scheduling";
import { offerPaintAt, type ServiceTeamRow } from "@repo/ui/public-site";
import type { ServiceOffer, ServiceRow } from "@repo/ui/services";

// The offer (Oferta) as its roster and a service's page show it: each
// service with who offers it at what price, its catalogue and place in the
// offer's layout (as the site's menu has it) and its week's visits.

export const categoryLabels: Record<ServiceCategory, string> = {
  consultation: "Konsultacja",
  psychotherapy: "Psychoterapia",
  couples_therapy: "Terapia par",
  assessment: "Diagnoza",
  workshop_related: "Warsztaty",
  other: "Inne",
};

/** `220 zł`, `240,50 zł`. */
export function formatOfferPrice(offer: {
  priceMinor: number;
  currencyCode: string;
}) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: offer.currencyCode,
    maximumFractionDigits: offer.priceMinor % 100 ? 2 : 0,
  }).format(offer.priceMinor / 100);
}

/**
 * Who the service's page on the site lists, as it says it: the active
 * offers, each with its price, time and forms.
 */
export function siteTeam(offers: ServiceOffer[]): ServiceTeamRow[] {
  return offers
    .filter((offer) => offer.active)
    .map((offer) => ({
      key: offer.id,
      name: offer.specialist.name,
      href: offer.specialist.href,
      meta: [
        offer.price,
        `${offer.durationMinutes} min`,
        [offer.inPerson ? "w gabinecie" : null, offer.online ? "online" : null]
          .filter(Boolean)
          .join(" lub "),
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

/** A specialist as an offer names them. */
export interface OfferPerson {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  color: string | null;
  professionalTitle: string | null;
}

const collator = new Intl.Collator("pl");

function emptyWeek(week: string, today: string): ServiceDay[] {
  return WEEKDAY_ABBR.map((weekday, index) => {
    const date = addDays(week, index);
    return { date, weekday, isToday: date === today, count: 0 };
  });
}

/**
 * The services in the offer's layout (the catalogues unfolded), each with
 * its offers (by the specialist's name; those of someone unknown left
 * out), its catalogue, its place on the site (active and shown ones, in
 * the same order; their watercolors by it) and the week read for it.
 */
export function toServiceRows(input: {
  services: Service[];
  catalogs: ServiceCatalog[];
  offers: SpecialistService[];
  people: OfferPerson[];
  weeks: Map<string, ServiceWeek>;
  /** The week's Monday. */
  week: string;
  today: string;
  /** The site's address. */
  webUrl: string;
}): ServiceRow[] {
  const people = new Map(input.people.map((one) => [one.id, one]));
  const laid = flattenOffer(arrangeOffer(input.services, input.catalogs));
  const onSite = laid
    .map((one) => one.service)
    .filter((service) => service.active && service.publiclyVisible);
  return laid.map(({ service, catalog }, index) => {
    const place = onSite.indexOf(service);
    const offers = input.offers
      .filter((offer) => offer.serviceId === service.id)
      .flatMap((offer): ServiceOffer[] => {
        const person = people.get(offer.specialistId);
        if (!person) return [];
        return [
          {
            id: offer.id,
            specialist: {
              id: person.id,
              name: person.displayName,
              title: person.professionalTitle,
              initials: person.initials,
              avatarUrl: person.avatarUrl,
              color: person.color,
              href: `/specjalisci/${person.id}`,
            },
            price: formatOfferPrice(offer),
            priceMinor: offer.priceMinor,
            durationMinutes:
              offer.durationMinutes ?? service.defaultDurationMinutes,
            inPerson: offer.supportsInPerson,
            online: offer.supportsOnline,
            active: offer.active,
          },
        ];
      })
      .sort((a, b) => collator.compare(a.specialist.name, b.specialist.name));
    const week = input.weeks.get(service.id);
    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      category: service.category,
      categoryLabel: categoryLabels[service.category],
      href: `/oferta/${service.id}`,
      publicUrl: `${input.webUrl}/oferta/${service.slug}`,
      durationMinutes: service.defaultDurationMinutes,
      afterMinutes: service.afterMinutes,
      shortDescription: service.shortDescription,
      active: service.active,
      publiclyVisible: service.publiclyVisible,
      bookingEnabled: service.bookingEnabled,
      sortOrder: service.sortOrder,
      catalog: catalog ? { id: catalog.id, name: catalog.name } : null,
      order: index + 1,
      position: place >= 0 ? place + 1 : null,
      paint: offerPaintAt(place),
      offers,
      days: week?.days ?? emptyWeek(input.week, input.today),
      visitCount: week?.visitCount ?? 0,
      upcoming: week?.upcoming ?? [],
    };
  });
}

/**
 * A service's time in the schedule: its visit and the time after it (notes,
 * getting ready). More than the centre's grid step, and not a whole number
 * of steps, the next visit can only start at the following mark: said, with
 * the totals that fit.
 */
export function scheduleTime(
  visitMinutes: number,
  afterMinutes: number,
  stepMinutes: number,
) {
  const total = visitMinutes + afterMinutes;
  const steps = Math.ceil(total / stepMinutes);
  const warning =
    total > stepMinutes && total % stepMinutes !== 0
      ? `Terminy są co ${stepMinutes} min: przy ${total} min następna wizyta zacznie się dopiero po ${steps * stepMinutes} min. Ustaw łącznie ${(steps - 1) * stepMinutes} lub ${steps * stepMinutes} min.`
      : null;
  return { total, label: `${total} min w grafiku`, warning };
}
