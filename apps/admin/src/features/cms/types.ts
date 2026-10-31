import type {
  RoomsPageContent,
  FirstStepsContent,
  HomeHeadersContent,
  HomePageContent,
  HomeStoryStep,
  HomeSpotlight,
  SupportArea,
} from "@repo/contracts";

/** The hero's draft, every field, with its photo's address to preview. */
export interface HomeContentViewModel extends HomePageContent {
  imageUrl: string | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  /** Raw, for the page's status (pageStatus). */
  publishedAt: string | null;
  updatedAt: string;
}

export interface RoomsPageViewModel extends RoomsPageContent {
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
  specialists: {
    id: string;
    name: string;
    onSite: boolean;
    portraitUrl?: string | null;
  }[];
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  /** Raw, for the page's status (pageStatus). */
  publishedAt: string | null;
  updatedAt: string;
}

export interface FirstStepsViewModel extends FirstStepsContent {
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  publishedAt: string | null;
  updatedAt: string;
}

export interface HomeHeadersViewModel {
  headers: HomeHeadersContent;
  /** What a header may link to booking. */
  services: { slug: string; name: string; requiresIntake: boolean }[];
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  publishedAt: string | null;
  updatedAt: string;
}

/** A section's draft as its editor shows it, with its publication. */
export interface ContentViewModel<Content> {
  content: Content;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string;
  publishedAt: string | null;
  updatedAt: string;
}

/** A story step as its editor shows it: its photo's address to preview. */
export interface HomeStoryStepRow extends HomeStoryStep {
  imageUrl: string | null;
}
