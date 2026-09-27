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
