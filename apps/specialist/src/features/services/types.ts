export interface MyServiceItemViewModel {
  id: string;
  serviceId: string;
  serviceName: string;
  description: string | null;
  priceMinor: number;
  priceLabel: string;
  /** The specialist's own duration, `null` when the catalogue default applies. */
  durationMinutes: number | null;
  defaultDurationMinutes: number | null;
  durationLabel: string;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  active: boolean;
  acceptingNewClients: boolean;
}

export interface AddableServiceViewModel {
  id: string;
  name: string;
  description: string | null;
  defaultDurationMinutes: number;
}

export interface MyServicesViewModel {
  items: MyServiceItemViewModel[];
  addableServices: AddableServiceViewModel[];
  activeCount: number;
  totalCount: number;
  /** Mean price of active offers, `null` when none is active. */
  averagePriceLabel: string | null;
  averageDurationLabel: string | null;
}
