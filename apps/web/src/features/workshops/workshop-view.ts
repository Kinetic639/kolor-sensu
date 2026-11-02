import type { PublicSpecialistOffer } from "@repo/contracts";
import { formatDate, formatWeekday } from "@repo/scheduling";
import type { WorkshopCardData, WorkshopSeatsTone } from "@repo/ui/public-site";
import type { PublicWorkshop } from "@repo/supabase/workshops";
import type { Route } from "next";
import { formatPrice } from "@/lib/format";

// Warsztaty as the site shows them (docs/product/workshops-plan.md): the
// coming ones and the past ones, the form filter, the words on a card and
// a page, whether one can sign up, and the Event data for Google. Pure, so
// it is tested without a database; dates in the centre's time zone.

export const WORKSHOPS_PATH = "/warsztaty" as Route;

export const workshopHref = (slug: string) => `/warsztaty/${slug}` as Route;

/** `?forma=online` or `?forma=stacjonarnie`; anything else: both. */
export type ModalityFilter = "online" | "stacjonarnie" | null;

export function readModality(value: unknown): ModalityFilter {
  return value === "online" || value === "stacjonarnie" ? value : null;
}

const matches = (workshop: PublicWorkshop, filter: ModalityFilter) =>
  filter === null ||
  (filter === "online"
    ? workshop.modality === "online"
    : workshop.modality === "in_person");

/**
 * The coming workshops (soonest first; a cancelled one stays, labelled,
 * until its day) and the past ones (latest first, a few).
 */
export function splitWorkshops(
  all: readonly PublicWorkshop[],
  now: Date,
  filter: ModalityFilter = null,
  pastLimit = 6,
) {
  const time = now.getTime();
  const shown = all.filter((workshop) => matches(workshop, filter));
  const upcoming = shown
    .filter(
      (workshop) =>
        (workshop.status === "published" || workshop.status === "cancelled") &&
        new Date(workshop.endsAt).getTime() > time,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = shown
    .filter(
      (workshop) =>
        workshop.status === "completed" ||
        (workshop.status === "published" &&
          new Date(workshop.endsAt).getTime() <= time),
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, pastLimit);
  return { upcoming, past };
}

function localDay(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(instant),
  );
}

function localTime(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instant));
}

/** `wtorek, 12 listopada 2030` */
export function workshopDateLabel(startsAt: string, timeZone: string) {
  const day = localDay(startsAt, timeZone);
  return `${formatWeekday(day)}, ${formatDate(day)}`;
}

/** `17:00–19:00` */
export function workshopTimeLabel(
  startsAt: string,
  endsAt: string,
  timeZone: string,
) {
  return `${localTime(startsAt, timeZone)}–${localTime(endsAt, timeZone)}`;
}

/** `Online`, or the place (and its room, on the page). */
export function workshopPlace(
  workshop: Pick<
    PublicWorkshop,
    "modality" | "locationName" | "locationAddress" | "roomName"
  >,
  { room = false } = {},
) {
  if (workshop.modality === "online") return "Online";
  const where =
    [workshop.locationName, workshop.locationAddress]
      .filter(Boolean)
      .join(", ") || "Stacjonarnie";
  return room && workshop.roomName ? `${where} (${workshop.roomName})` : where;
}

/**
 * "Inne warsztaty" under a workshop (#185): the others still coming and not
 * cancelled, soonest first, `max` at most.
 */
export function relatedWorkshops(
  workshop: Pick<PublicWorkshop, "id">,
  all: readonly PublicWorkshop[],
  now: Date,
  max = 3,
) {
  return splitWorkshops(all, now)
    .upcoming.filter(
      (one) => one.id !== workshop.id && one.status === "published",
    )
    .slice(0, max);
}

/** The leader's services under a workshop (#185): each once, in order. */
export function relatedServices(
  offers: readonly Pick<PublicSpecialistOffer, "serviceName" | "serviceSlug">[],
  max = 3,
) {
  const seen = new Set<string>();
  const services: { name: string; slug: string }[] = [];
  for (const offer of offers) {
    if (seen.has(offer.serviceSlug)) continue;
    seen.add(offer.serviceSlug);
    services.push({ name: offer.serviceName, slug: offer.serviceSlug });
  }
  return services.slice(0, max);
}

/**
 * How to get to a workshop held in place (#211): the location's words, if
 * any, and the maps at its name and address (a plain link: no map is
 * loaded here). Null online, or with no place to show on a map.
 */
export function workshopWayThere(
  workshop: Pick<
    PublicWorkshop,
    "modality" | "locationName" | "locationAddress" | "locationDirections"
  >,
) {
  if (workshop.modality === "online") return null;
  const where = [workshop.locationName, workshop.locationAddress]
    .filter(Boolean)
    .join(", ");
  if (!where) return null;
  return {
    directions: workshop.locationDirections?.trim() || null,
    mapsHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`,
  };
}

/** `150 zł` or `Bezpłatnie`. */
export function workshopPrice(
  workshop: Pick<PublicWorkshop, "priceMinor" | "currencyCode">,
) {
  return workshop.priceMinor === 0 ? "Bezpłatnie" : formatPrice(workshop);
}

export function leadersLabel(workshop: Pick<PublicWorkshop, "leaders">) {
  return workshop.leaders.map((leader) => leader.name).join(", ") || null;
}

/** `1 miejsce`, `3 miejsca`, `12 miejsc`. */
export function seatsWord(count: number) {
  const tens = count % 100;
  const ones = count % 10;
  if (count === 1) return "1 miejsce";
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14))
    return `${count} miejsca`;
  return `${count} miejsc`;
}

/** `1 osoba`, `3 osoby`, `5 osób`. */
export function peopleWord(count: number) {
  const tens = count % 100;
  const ones = count % 10;
  if (count === 1) return "1 osoba";
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14))
    return `${count} osoby`;
  return `${count} osób`;
}

/** What one can do on the workshop's page now. */
export type SignupState = "open" | "full" | "closed" | "cancelled" | "past";

export function signupState(workshop: PublicWorkshop, now: Date): SignupState {
  if (workshop.status === "cancelled") return "cancelled";
  if (
    workshop.status === "completed" ||
    new Date(workshop.startsAt).getTime() <= now.getTime()
  )
    return "past";
  if (!workshop.registrationOpen) return "closed";
  return workshop.seatsLeft > 0 ? "open" : "full";
}

/** A week before the start: the end of the full refund and of paying later. */
export function workshopNoticeAt(workshop: Pick<PublicWorkshop, "startsAt">) {
  return new Date(new Date(workshop.startsAt).getTime() - 7 * 86_400_000);
}

/**
 * The workshop's own rules, as a visitor reads them (#275): none once it is
 * cancelled or over; in its last week, pay at once and no full refund.
 * `noticeLabel` says when the week starts, in the centre's words.
 */
export function workshopRules(
  workshop: PublicWorkshop,
  now: Date,
  noticeLabel: string,
): string[] | null {
  const state = signupState(workshop, now);
  if (state === "cancelled" || state === "past") return null;
  const rules: string[] = [];
  if (workshop.priceMinor > 0) {
    if (now < workshopNoticeAt(workshop)) {
      rules.push(
        `Rezygnacja do ${noticeLabel}: pełny zwrot. Później zwracamy pieniądze, gdy Twoje miejsce zajmie ktoś z listy rezerwowej; możesz też przekazać miejsce innej osobie.`,
        `Możesz zapłacić od razu albo zarezerwować miejsce i zapłacić do ${noticeLabel}; bez wpłaty miejsce się zwalnia.`,
      );
    } else {
      rules.push(
        "Do warsztatu został mniej niż tydzień: płacisz od razu, przy zapisie.",
        "Przy rezygnacji zwracamy pieniądze, gdy Twoje miejsce zajmie ktoś z listy rezerwowej; możesz też przekazać miejsce innej osobie.",
      );
    }
  }
  if (workshop.minParticipants) {
    rules.push(
      `Warsztat odbędzie się, gdy zapisze się co najmniej ${peopleWord(workshop.minParticipants)}. Gdyby nie doszedł do skutku, oddamy całą wpłatę.`,
    );
  }
  rules.push("Gdy warsztat odwołamy my, zawsze oddajemy całą wpłatę.");
  if (workshop.modality === "online") {
    rules.push("Link do spotkania wyślemy e-mailem dzień przed warsztatem.");
  }
  return rules;
}

/** The seats on a card: a few left (three or fewer), full, or nothing. */
export function seatsInfo(
  workshop: PublicWorkshop,
  now: Date,
): { label: string | null; tone: WorkshopSeatsTone } {
  const state = signupState(workshop, now);
  if (state === "full")
    return { label: "Brak miejsc · lista rezerwowa", tone: "full" };
  if (state === "open" && workshop.seatsLeft <= 3)
    return {
      label:
        workshop.seatsLeft === 1
          ? "Ostatnie miejsce"
          : `Ostatnie ${seatsWord(workshop.seatsLeft)}`,
      tone: "few",
    };
  return { label: null, tone: null };
}

export function statusLabel(workshop: PublicWorkshop, now: Date) {
  const state = signupState(workshop, now);
  if (state === "cancelled") return "Odwołany";
  if (state === "past") return "Zakończony";
  return null;
}

export function workshopCard(
  workshop: PublicWorkshop,
  {
    now,
    timeZone,
    imageUrl,
  }: { now: Date; timeZone: string; imageUrl: (path: string) => string },
): WorkshopCardData {
  const seats = seatsInfo(workshop, now);
  const state = signupState(workshop, now);
  return {
    id: workshop.id,
    href: workshopHref(workshop.slug),
    title: workshop.title,
    description: workshop.shortDescription,
    dateLabel: workshopDateLabel(workshop.startsAt, timeZone),
    timeLabel: workshopTimeLabel(workshop.startsAt, workshop.endsAt, timeZone),
    placeLabel: workshopPlace(workshop),
    priceLabel: workshopPrice(workshop),
    availabilityLabel:
      state === "past" || state === "cancelled"
        ? null
        : `${workshop.seatsLeft} z ${workshop.capacity}`,
    leaders: leadersLabel(workshop),
    coverUrl: workshop.coverPath ? imageUrl(workshop.coverPath) : null,
    coverAlt: workshop.coverAlt ?? "",
    seatsLabel: seats.label,
    seatsTone: seats.tone,
    statusLabel: statusLabel(workshop, now),
  };
}

/** The program's points: one per line, without list marks. */
export function agendaPoints(agenda: string | null): string[] {
  return (agenda ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

/** The page's title and description for Google and link previews. */
export function workshopSeo(workshop: PublicWorkshop) {
  return {
    title: workshop.seoTitle || `${workshop.title} · Warsztaty`,
    description:
      workshop.seoDescription ||
      workshop.shortDescription ||
      `Warsztat w Kolor Sensu: ${workshop.title}.`,
  };
}

/** schema.org Event: the date, the place (or online), the price, the seats. */
export function workshopEventJsonLd(
  workshop: PublicWorkshop,
  {
    siteUrl,
    imageUrl,
  }: { siteUrl: string; imageUrl: (path: string) => string },
) {
  const url = `${siteUrl}${workshopHref(workshop.slug)}`;
  const online = workshop.modality === "online";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: workshop.title,
    description: workshopSeo(workshop).description,
    url,
    startDate: workshop.startsAt,
    endDate: workshop.endsAt,
    eventStatus:
      workshop.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: online
      ? { "@type": "VirtualLocation", url }
      : {
          "@type": "Place",
          name: workshop.locationName ?? "Kolor Sensu",
          ...(workshop.locationAddress && {
            address: workshop.locationAddress,
          }),
        },
    ...(workshop.coverPath && { image: [imageUrl(workshop.coverPath)] }),
    organizer: { "@type": "Organization", name: "Kolor Sensu", url: siteUrl },
    ...(workshop.leaders.length && {
      performer: workshop.leaders.map((leader) => ({
        "@type": "Person",
        name: leader.name,
      })),
    }),
    offers: {
      "@type": "Offer",
      url,
      price: (workshop.priceMinor / 100).toFixed(2),
      priceCurrency: workshop.currencyCode,
      availability:
        workshop.seatsLeft > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
    },
  };
}
