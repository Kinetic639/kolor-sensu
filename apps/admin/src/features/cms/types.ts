import type { HomeSpotlight, SupportArea } from "@repo/contracts";

export interface HomeContentViewModel {
  heading: string;
  body: string;
  buttonLabel: string | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  /** Raw, for the page's status (pageStatus). */
  publishedAt: string | null;
  updatedAt: string;
}

export interface RoomsPageViewModel {
  showAmenitiesSection: boolean;
  showLocationDetails: boolean;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  /** Raw, for the page's status (pageStatus). */
  publishedAt: string | null;
  updatedAt: string;
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
  /** Raw, for the page's status (pageStatus). */
  publishedAt: string | null;
  updatedAt: string;
}

export interface HomeSectionsViewModel {
  showSpecialists: boolean;
  spotlight: HomeSpotlight & { imageUrl: string | null };
  /** Whom the spotlight may show; only those on the site will appear. */
  specialists: { id: string; name: string; onSite: boolean }[];
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  /** Raw, for the page's status (pageStatus). */
  publishedAt: string | null;
  updatedAt: string;
}
