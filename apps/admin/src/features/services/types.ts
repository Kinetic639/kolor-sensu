import type { ServiceCategory } from "@repo/contracts";

export interface ServiceListItemViewModel {
  id: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  categoryLabel: string;
  durationLabel: string;
  active: boolean;
  publiclyVisible: boolean;
  bookingEnabled: boolean;
  specialistOfferCount: number;
  sortOrder: number;
}
export interface ServicesListViewModel {
  items: ServiceListItemViewModel[];
  totalCount: number;
  activeCount: number;
  publicCount: number;
  bookingCount: number;
}
export interface ServiceOfferViewModel {
  id: string;
  specialistName: string;
  professionalTitle: string | null;
  priceLabel: string;
  durationLabel: string;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  active: boolean;
}
export interface ServiceDetailViewModel extends ServiceListItemViewModel {
  shortDescription: string | null;
  description: string | null;
  offers: ServiceOfferViewModel[];
}
