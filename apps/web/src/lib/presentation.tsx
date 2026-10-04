import {
  offerPaintAt,
  SERVICE_ICONS,
  specialistSplashAt,
  type OfferService,
  type Specialist,
} from "@repo/ui/public-site";
import type {
  PublicOffer,
  PublicService,
  SpecialistWithMedia,
} from "@/lib/public-data";
import { serviceHref, serviceTitle } from "@/lib/site-frame";
import { formatDuration, formatPrice } from "./format";

export { formatDuration, formatPrice };

// Database records as the public-site components show them.

/** Portrait for a specialist without a photo yet. */
export const portraitPlaceholder = "/images/specjalista.svg";

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
    splash: specialistSplashAt(index),
  };
}

export function specialistSplash(index: number) {
  return specialistSplashAt(index);
}

export function toOfferTile(
  service: PublicService,
  index: number,
): OfferService {
  return {
    title: serviceTitle(service),
    ...(service.shortDescription && { description: service.shortDescription }),
    href: serviceHref(service.slug),
    icon: SERVICE_ICONS[service.category],
    paint: offerPaintAt(index),
  };
}

/** "od 180 zł" for a service offered at several prices. */
export function priceRange(offers: PublicOffer[]) {
  if (offers.length === 0) return null;
  const lowest = offers.reduce((a, b) => (b.priceMinor < a.priceMinor ? b : a));
  const same = offers.every((offer) => offer.priceMinor === lowest.priceMinor);
  return same ? formatPrice(lowest) : `od ${formatPrice(lowest)}`;
}

export function offerModes(offer: PublicOffer) {
  return [
    offer.supportsInPerson ? "w gabinecie" : null,
    offer.supportsOnline ? "online" : null,
  ]
    .filter(Boolean)
    .join(" lub ");
}
