import type { SpecialistOffer } from "@repo/ui/specialists";
import type {
  ProfilePublicationStatus,
  RichTextDocument,
} from "@repo/contracts";

export interface SpecialistListItemViewModel {
  id: string;
  displayName: string;
  initials: string;
  /** Their colour in schedules and lists (set or automatic). */
  accent: string;
  /** A light tint of it, behind initials. */
  tint: string;
  /** Set by an admin; null: the automatic colour. */
  color: string | null;
  /** `2026-03-01` */
  joinedAt: string | null;
  publicSlug: string;
  avatarUrl: string | null;
  professionalTitle: string;
  active: boolean;
  accountActive: boolean;
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
  firstName: string;
  lastName: string;
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
  /** Labels, in a fixed order. */
  clientGroups: string[];
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

export interface SpecialistDetailViewModel {
  id: string;
  userId: string;
  displayName: string;
  initials: string;
  /** Set by an admin; null: the automatic colour. */
  color: string | null;
  /** Their colour now (set or automatic). */
  accent: string;
  /** A light tint of it, behind initials. */
  tint: string;
  /** What the automatic colour is. */
  automaticAccent: string;
  avatarUrl: string | null;
  professionalTitle: string;
  publicSlug: string;
  joinedAt: string | null;
  active: boolean;
  accountActive: boolean;
  publicProfile: SpecialistProfileSnapshotViewModel | null;
  draft: SpecialistDraftViewModel | null;
  offers: SpecialistOffer[];
  /** `4 · od 195 zł` (the active ones); `Brak` */
  offerSummary: string;
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
