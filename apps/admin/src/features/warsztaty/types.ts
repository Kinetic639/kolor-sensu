import type { WorkshopModality, WorkshopStatus } from "@repo/contracts";

export interface WorkshopListItemViewModel {
  id: string;
  title: string;
  slug: string;
  status: WorkshopStatus;
  statusLabel: string;
  modality: WorkshopModality;
  modalityLabel: string;
  dateLabel: string;
  timeLabel: string;
  startsAt: string;
  specialistName: string;
  locationLabel: string | null;
  priceLabel: string;
  capacity: number;
  registrationEnabled: boolean;
}

export interface WorkshopsListViewModel {
  items: WorkshopListItemViewModel[];
  totalCount: number;
  publishedCount: number;
  draftCount: number;
  upcomingCount: number;
}

export interface WorkshopDetailViewModel extends WorkshopListItemViewModel {
  shortDescription: string | null;
  longDescription: string | null;
  specialistId: string;
  locationId: string | null;
  roomId: string | null;
  roomName: string | null;
  endsAt: string;
  priceMinor: number;
  currencyCode: string;
  coverImagePath: string | null;
}

export interface WorkshopFormSpecialistOption {
  id: string;
  displayName: string;
  professionalTitle: string | null;
}

export interface WorkshopFormLocationOption {
  id: string;
  name: string;
}

export interface WorkshopFormRoomOption {
  id: string;
  name: string;
  locationId: string;
}

export interface WorkshopFormOptions {
  specialists: WorkshopFormSpecialistOption[];
  locations: WorkshopFormLocationOption[];
  rooms: WorkshopFormRoomOption[];
}
