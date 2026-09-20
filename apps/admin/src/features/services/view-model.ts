import type {
  AdminServiceOfferSummary,
  AdminServiceSummary,
} from "@repo/supabase";
import type { Service, ServiceCategory } from "@repo/contracts";
import type { ServiceDetailViewModel, ServicesListViewModel } from "./types";

export const categoryLabels: Record<ServiceCategory, string> = {
  consultation: "Konsultacja",
  psychotherapy: "Psychoterapia",
  couples_therapy: "Terapia par",
  assessment: "Diagnoza",
  workshop_related: "Warsztaty",
  other: "Inne",
};
const mapItem = (service: AdminServiceSummary) => ({
  id: service.id,
  name: service.name,
  slug: service.slug,
  category: service.category,
  categoryLabel: categoryLabels[service.category],
  durationLabel: `${service.defaultDurationMinutes} min`,
  active: service.active,
  publiclyVisible: service.publiclyVisible,
  bookingEnabled: service.bookingEnabled,
  specialistOfferCount: service.specialistOfferCount,
  sortOrder: service.sortOrder,
});
export function mapServicesList(
  services: AdminServiceSummary[],
): ServicesListViewModel {
  const items = services.map(mapItem);
  return {
    items,
    totalCount: items.length,
    activeCount: items.filter((item) => item.active).length,
    publicCount: items.filter((item) => item.publiclyVisible).length,
    bookingCount: items.filter((item) => item.bookingEnabled).length,
  };
}
export function mapServiceDetail(
  service: Service,
  offers: AdminServiceOfferSummary[],
): ServiceDetailViewModel {
  const item = mapItem({ ...service, specialistOfferCount: offers.length });
  return {
    ...item,
    shortDescription: service.shortDescription,
    description: service.description,
    offers: offers.map((offer) => ({
      id: offer.id,
      specialistName: offer.specialistName,
      professionalTitle: offer.specialistProfessionalTitle,
      priceLabel: new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: offer.currencyCode,
      }).format(offer.priceMinor / 100),
      durationLabel: `${offer.durationMinutes ?? service.defaultDurationMinutes} min`,
      supportsInPerson: offer.supportsInPerson,
      supportsOnline: offer.supportsOnline,
      active: offer.active,
    })),
  };
}
