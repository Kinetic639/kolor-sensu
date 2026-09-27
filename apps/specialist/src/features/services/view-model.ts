import type { Service, SpecialistService } from "@repo/contracts";
import type { MyServiceItemViewModel, MyServicesViewModel } from "./types";

const priceFormatter = (currency: string) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency });

/** "180", "180,5" or "1 200.99" (złoty) to minor units; `null` if invalid. */
export function parsePriceToMinor(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Minor units to the text a price input shows ("180" or "180,50"). */
export function formatPriceInput(priceMinor: number): string {
  const whole = Math.floor(priceMinor / 100);
  const cents = priceMinor % 100;
  return cents ? `${whole},${String(cents).padStart(2, "0")}` : String(whole);
}

export function mapMyServicesViewModel(
  offers: SpecialistService[],
  services: Service[],
): MyServicesViewModel {
  const serviceById = new Map(services.map((service) => [service.id, service]));

  const items: MyServiceItemViewModel[] = offers
    .map((offer) => {
      const service = serviceById.get(offer.serviceId);
      const duration = offer.durationMinutes ?? service?.defaultDurationMinutes;
      return {
        id: offer.id,
        serviceId: offer.serviceId,
        serviceName: service?.name ?? "Usługa niedostępna w katalogu",
        description: service?.shortDescription ?? null,
        priceMinor: offer.priceMinor,
        priceLabel: priceFormatter(offer.currencyCode).format(
          offer.priceMinor / 100,
        ),
        durationMinutes: offer.durationMinutes,
        defaultDurationMinutes: service?.defaultDurationMinutes ?? null,
        durationLabel: duration ? `${duration} min` : "Nieustalony",
        supportsInPerson: offer.supportsInPerson,
        supportsOnline: offer.supportsOnline,
        active: offer.active,
        acceptingNewClients: offer.acceptingNewClients,
      };
    })
    .sort((a, b) => a.serviceName.localeCompare(b.serviceName, "pl"));

  const active = offers.filter((offer) => offer.active);
  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const activeDurations = active
    .map(
      (offer) =>
        offer.durationMinutes ??
        serviceById.get(offer.serviceId)?.defaultDurationMinutes,
    )
    .filter((value): value is number => value !== undefined);
  const offeredServiceIds = new Set(offers.map((offer) => offer.serviceId));

  return {
    items,
    addableServices: services
      .filter((service) => !offeredServiceIds.has(service.id))
      .map((service) => ({
        id: service.id,
        name: service.name,
        description: service.shortDescription,
        defaultDurationMinutes: service.defaultDurationMinutes,
      })),
    activeCount: active.length,
    totalCount: offers.length,
    averagePriceLabel: active.length
      ? priceFormatter(active[0]!.currencyCode).format(
          Math.round(average(active.map((offer) => offer.priceMinor))) / 100,
        )
      : null,
    averageDurationLabel: activeDurations.length
      ? `${Math.round(average(activeDurations))} min`
      : null,
  };
}
