export interface HomeContentViewModel {
  heading: string;
  body: string;
  buttonLabel: string | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
}
