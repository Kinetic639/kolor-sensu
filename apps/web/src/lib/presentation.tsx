import type {
  OfferPaint,
  OfferService,
  Specialist,
  SpecialistSplash,
} from "@repo/ui/public-site";
import { serviceIcons } from "@/content/site";
import type {
  PublicOffer,
  PublicService,
  SpecialistWithMedia,
} from "@/lib/public-data";
import { serviceHref, serviceTitle } from "@/lib/site-frame";

// Database records as the public-site components show them.

/** Portrait for a specialist without a photo yet. */
export const portraitPlaceholder = "/images/specjalista.svg";

const splashes: SpecialistSplash[] = ["pink-1", "sage-1", "pink-2", "sage-2"];
const paints: OfferPaint[] = ["sage-1", "pink-1", "sage-2", "pink-2"];

/** The booking page, telling it which specialist the visitor chose. */
export function bookingHref(slug: string) {
  return `/umow-wizyte?${new URLSearchParams({ specjalista: slug })}`;
}

export function specialistHref(slug: string) {
  return `/specjalisci/${slug}`;
}

export function specialistRole(specialist: SpecialistWithMedia) {
  return specialist.professionalTitle ?? "Specjalista";
}

export function toSpecialistCard(
  specialist: SpecialistWithMedia,
  index: number,
): Specialist {
  return {
    name: specialist.displayName,
    role: specialistRole(specialist),
    href: specialistHref(specialist.publicSlug),
    portraitSrc:
      specialist.portraitUrl ?? specialist.photoUrl ?? portraitPlaceholder,
    portraitAlt: `${specialist.displayName}, ${specialistRole(specialist)}`,
    splash: splashes[index % splashes.length]!,
  };
}

export function specialistSplash(index: number) {
  return splashes[index % splashes.length]!;
}

export function toOfferTile(
  service: PublicService,
  index: number,
): OfferService {
  return {
    title: serviceTitle(service),
    ...(service.shortDescription && { description: service.shortDescription }),
    href: serviceHref(service.slug),
    icon: serviceIcons[service.category],
    paint: paints[index % paints.length]!,
  };
}

const money = (currency: string) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

export function formatPrice(
  offer: Pick<PublicOffer, "priceMinor" | "currencyCode">,
) {
  return money(offer.currencyCode).format(offer.priceMinor / 100);
}

/** "od 180 zł" for a service offered at several prices. */
export function priceRange(offers: PublicOffer[]) {
  if (offers.length === 0) return null;
  const lowest = offers.reduce((a, b) => (b.priceMinor < a.priceMinor ? b : a));
  const same = offers.every((offer) => offer.priceMinor === lowest.priceMinor);
  return same ? formatPrice(lowest) : `od ${formatPrice(lowest)}`;
}

export function formatDuration(minutes: number) {
  return `${minutes} min`;
}

export function offerModes(offer: PublicOffer) {
  return [
    offer.supportsInPerson ? "w gabinecie" : null,
    offer.supportsOnline ? "online" : null,
  ]
    .filter(Boolean)
    .join(" lub ");
}
