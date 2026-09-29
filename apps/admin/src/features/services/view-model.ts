import type {
  AdminServiceOfferSummary,
  AdminServiceSummary,
} from "@repo/supabase";
import type { Service, ServiceCategory } from "@repo/contracts";
import type { ResourceListItem } from "@repo/ui/resource-list";
import type {
  ServiceDetailViewModel,
  ServiceListItemViewModel,
  ServicesListViewModel,
} from "./types";

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
/** The services as rows of the admin list; the filters are their tags. */
export function toServiceListItems(
  items: ServiceListItemViewModel[],
): ResourceListItem[] {
  return items.map((item) => {
    // An inactive service is neither on the site nor bookable.
    const onSite = item.active && item.publiclyVisible;
    const booking = item.active && item.bookingEnabled;
    return {
      id: item.id,
      href: `/oferta/${item.id}`,
      name: item.name,
      description: item.categoryLabel,
      facts: [item.durationLabel, `Specjaliści: ${item.specialistOfferCount}`],
      statuses: [
        item.active
          ? { label: "Aktywna", tone: "success" as const }
          : { label: "Nieaktywna", tone: "neutral" as const },
        ...(onSite ? [{ label: "Na stronie", tone: "info" as const }] : []),
        ...(booking
          ? [{ label: "Rezerwacja online", tone: "info" as const }]
          : []),
      ],
      tags: [
        item.active ? "active" : "inactive",
        ...(onSite ? ["on-site"] : []),
        ...(booking ? ["booking"] : []),
      ],
      muted: !item.active,
    };
  });
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
