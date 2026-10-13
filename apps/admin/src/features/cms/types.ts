import type { SupportArea } from "@repo/contracts";

export interface HomeContentViewModel {
  heading: string;
  body: string;
  buttonLabel: string | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
}

export interface RoomsPageViewModel {
  showAmenitiesSection: boolean;
  showLocationDetails: boolean;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
}

/** An area of help as the editor shows it: its photo's address to preview. */
export interface SupportAreaRow extends SupportArea {
  imageUrl: string | null;
}

export interface SupportAreasViewModel {
  areas: SupportAreaRow[];
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
}
