import { centreToday } from "./load-wizard";
import { shiftDay } from "@repo/ui/public-site/availability-calendar-dates";
import {
  getBookableCatalog,
  getBookingWindow,
  getLocations,
} from "@/lib/public-data";
import { formatDuration, formatPrice } from "@/lib/format";
import { HanddrawnLink } from "@repo/ui/public-site";
import type { CompactBookingService } from "@repo/ui/public-site/compact-booking-calendar";
import { SpecialistBookingClient } from "./specialist-booking.client";

export async function SpecialistBooking({
  specialistSlug,
  specialistName,
}: {
  specialistSlug: string;
  specialistName: string;
}) {
  const [catalog, window, locations] = await Promise.all([
    getBookableCatalog(),
    getBookingWindow(),
    getLocations(),
  ]);
  const services = catalog.services.flatMap((service) => {
    const offer = catalog.offers.find(
      (one) =>
        one.specialistPublicSlug === specialistSlug &&
        one.serviceSlug === service.slug,
    );
    if (!offer) return [];
    const modes: CompactBookingService["modes"] = [];
    if (offer.supportsInPerson && locations.length) modes.push("stacjonarnie");
    if (offer.supportsOnline) modes.push("online");
    return modes.length
      ? [
          {
            slug: service.slug,
            name: service.name,
            detail: `${formatDuration(offer.effectiveDurationMinutes)} · ${formatPrice(offer)}`,
            modes,
          },
        ]
      : [];
  });
  if (!window || !services.length)
    return (
      <div className="ks-booking-mini ks-booking-mini--contact">
        <h3>Porozmawiajmy o terminie</h3>
        <p>
          Skontaktuj się z nami — pomożemy znaleźć odpowiednią formę spotkania.
        </p>
        <HanddrawnLink
          href={`/kontakt?wiadomosc=${encodeURIComponent(`Szukam terminu u: ${specialistName}`)}#formularz`}
        >
          Zapytaj o termin
        </HanddrawnLink>
      </div>
    );
  return (
    <SpecialistBookingClient
      today={centreToday(window.timeZone)}
      lastDay={shiftDay(centreToday(window.timeZone), window.horizonDays)}
      specialistSlug={specialistSlug}
      specialistName={specialistName}
      services={services}
      locations={locations.map((one) => ({ slug: one.slug, name: one.name }))}
    />
  );
}
