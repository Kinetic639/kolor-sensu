import {
  formatPriceMinor,
  formatWorkshopDate,
  formatWorkshopTimeRange,
  workshopModalityLabels,
  workshopStatusLabels,
} from "@repo/contracts";
import type { AdminWorkshopSummary } from "@repo/supabase";
import type {
  WorkshopDetailViewModel,
  WorkshopListItemViewModel,
  WorkshopsListViewModel,
} from "./types";

function mapItem(workshop: AdminWorkshopSummary): WorkshopListItemViewModel {
  return {
    id: workshop.id,
    title: workshop.title,
    slug: workshop.slug,
    status: workshop.status,
    statusLabel: workshopStatusLabels[workshop.status],
    modality: workshop.modality,
    modalityLabel: workshopModalityLabels[workshop.modality],
    dateLabel: formatWorkshopDate(workshop.startsAt),
    timeLabel: formatWorkshopTimeRange(workshop.startsAt, workshop.endsAt),
    startsAt: workshop.startsAt,
    specialistName: workshop.specialistDisplayName,
    locationLabel:
      workshop.modality === "online"
        ? "Online"
        : (workshop.locationName ?? null),
    priceLabel:
      workshop.priceMinor === 0
        ? "Bezpłatny"
        : formatPriceMinor(workshop.priceMinor, workshop.currencyCode),
    capacity: workshop.capacity,
    registrationEnabled: workshop.registrationEnabled,
  };
}

export function mapWorkshopsList(
  workshops: AdminWorkshopSummary[],
): WorkshopsListViewModel {
  const items = workshops.map(mapItem);
  const now = new Date();
  return {
    items,
    totalCount: items.length,
    publishedCount: items.filter((item) => item.status === "published").length,
    draftCount: items.filter((item) => item.status === "draft").length,
    upcomingCount: items.filter(
      (item) => item.status === "published" && new Date(item.startsAt) > now,
    ).length,
  };
}

export function mapWorkshopDetail(
  workshop: AdminWorkshopSummary,
): WorkshopDetailViewModel {
  return {
    ...mapItem(workshop),
    shortDescription: workshop.shortDescription,
    longDescription: workshop.longDescription,
    specialistId: workshop.specialistId,
    locationId: workshop.locationId,
    roomId: workshop.roomId,
    roomName: workshop.roomName,
    endsAt: workshop.endsAt,
    priceMinor: workshop.priceMinor,
    currencyCode: workshop.currencyCode,
    coverImagePath: workshop.coverImagePath,
  };
}
