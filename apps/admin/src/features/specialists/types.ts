import type {
  ProfilePublicationStatus,
  RichTextDocument,
} from "@repo/contracts";

export interface SpecialistListItemViewModel {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  professionalTitle: string;
  active: boolean;
  accountActive: boolean;
  acceptingNewClients: boolean;
  publicationStatus: ProfilePublicationStatus | null;
  serviceCount: number;
  pendingDraft: boolean;
  pendingDraftSubmittedAt: string | null;
}

export interface SpecialistsListViewModel {
  items: SpecialistListItemViewModel[];
  totalCount: number;
  activeCount: number;
  pendingReviewCount: number;
}

export interface SpecialistProfileSnapshotViewModel {
  displayName: string;
  professionalTitle: string | null;
  shortBio: string;
  longBio: RichTextDocument;
  /** Short-lived signed URLs, for showing the photos. */
  profilePhotoUrl: string | null;
  portraitPhotoUrl: string | null;
  /** Storage paths, for telling whether a photo changed. */
  profilePhotoPath: string | null;
  portraitPhotoPath: string | null;
  languages: string[];
  therapyApproaches: string[];
  specializations: string[];
  education: string[];
  certificates: string[];
  modalities: string[];
  publicationStatus: ProfilePublicationStatus;
  publishedAt: string | null;
}

export interface SpecialistDraftViewModel extends Omit<
  SpecialistProfileSnapshotViewModel,
  "publicationStatus" | "publishedAt"
> {
  id: string;
  status: ProfilePublicationStatus;
  submittedAt: string | null;
  reviewComment: string | null;
}

export interface SpecialistOfferViewModel {
  id: string;
  serviceName: string;
  priceLabel: string;
  durationLabel: string;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  active: boolean;
  acceptingNewClients: boolean;
}

export interface SpecialistDetailViewModel {
  id: string;
  userId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  professionalTitle: string;
  publicSlug: string;
  joinedAt: string | null;
  active: boolean;
  accountActive: boolean;
  acceptingNewClients: boolean;
  publicProfile: SpecialistProfileSnapshotViewModel | null;
  draft: SpecialistDraftViewModel | null;
  offers: SpecialistOfferViewModel[];
}

export interface ProfileDiffFieldViewModel {
  id: string;
  label: string;
  currentValue: string;
  proposedValue: string;
  changed: boolean;
  multiline?: boolean;
  currentImageUrl?: string | null;
  proposedImageUrl?: string | null;
}
