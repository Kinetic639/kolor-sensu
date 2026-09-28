import type {
  PublicLocation,
  PublicService,
  PublicSpecialistOffer,
} from "@repo/contracts";
import type { BookingMode, BookingParams } from "./search-params";

/** What can be booked: services with booking on, their offers, locations. */
export interface BookingCatalog {
  services: PublicService[];
  offers: PublicSpecialistOffer[];
  locations: PublicLocation[];
}

export type BookingStep =
  "usluga" | "forma" | "lokalizacja" | "specjalista" | "termin";

export interface BookingSelection {
  step: BookingStep;
  /** Choices that fit together; anything else from the URL is dropped. */
  service: PublicService | null;
  mode: BookingMode | null;
  location: PublicLocation | null;
  specialist: string | null;
  offer: PublicSpecialistOffer | null;
  /** The options of the current and earlier steps. */
  services: PublicService[];
  modes: BookingMode[];
  locations: PublicLocation[];
  offers: PublicSpecialistOffer[];
}

function supports(offer: PublicSpecialistOffer, mode: BookingMode) {
  return mode === "online" ? offer.supportsOnline : offer.supportsInPerson;
}

const MODE_ORDER: BookingMode[] = ["stacjonarnie", "online"];

/**
 * Resolves the URL choices against what can actually be booked, in the
 * wizard's order. A specialist chosen on their profile narrows every step;
 * a value that does not fit the earlier choices is dropped, never trusted.
 */
export function resolveBookingSelection(
  params: BookingParams,
  catalog: BookingCatalog,
): BookingSelection {
  const serviceSlugs = new Set(catalog.services.map((one) => one.slug));
  const bookable = catalog.offers.filter(
    (offer) => offer.acceptingNewClients && serviceSlugs.has(offer.serviceSlug),
  );

  const service =
    catalog.services.find((one) => one.slug === params.usluga) ?? null;

  // The specialist stays only if they can be booked for the chosen service.
  const specialist =
    params.specjalista &&
    bookable.some(
      (offer) =>
        offer.specialistPublicSlug === params.specjalista &&
        (!service || offer.serviceSlug === service.slug),
    )
      ? params.specjalista
      : null;

  const ofSpecialist = specialist
    ? bookable.filter((offer) => offer.specialistPublicSlug === specialist)
    : bookable;

  const services = catalog.services.filter((one) =>
    ofSpecialist.some((offer) => offer.serviceSlug === one.slug),
  );

  const forService = service
    ? ofSpecialist.filter((offer) => offer.serviceSlug === service.slug)
    : [];
  const modes = MODE_ORDER.filter((mode) =>
    forService.some((offer) => supports(offer, mode)),
  );
  const mode =
    params.forma && modes.includes(params.forma) ? params.forma : null;

  const locations = mode === "stacjonarnie" ? catalog.locations : [];
  const location =
    locations.length === 1
      ? locations[0]!
      : (locations.find((one) => one.slug === params.lokalizacja) ?? null);

  const offers = mode
    ? forService.filter((offer) => supports(offer, mode))
    : [];
  const offer =
    (specialist &&
      offers.find((one) => one.specialistPublicSlug === specialist)) ||
    null;

  const step: BookingStep = !service
    ? "usluga"
    : !mode
      ? "forma"
      : mode === "stacjonarnie" && !location
        ? "lokalizacja"
        : !offer
          ? "specjalista"
          : "termin";

  return {
    step,
    service,
    mode,
    location,
    specialist,
    offer,
    services,
    modes,
    locations,
    offers,
  };
}
