import type {
  ProfilePublicationStatus,
  SpecialistProfileDraftInput,
} from "@repo/contracts";

export type ProfileFormValues = SpecialistProfileDraftInput;

export interface ProfileEditorViewModel {
  /** Status of what the specialist sees; `null` before the first save. */
  status: ProfilePublicationStatus | null;
  /** A pending draft is immutable until an admin reviews it. */
  editable: boolean;
  reviewComment: string | null;
  lastModified: string | null;
  specialistId: string;
  /** The live public page, once a profile is published. */
  publicUrl: string | null;
  values: ProfileFormValues;
  /** Signed URLs for the stored photo paths in `values`. */
  photoPreviews: {
    profilePhotoUrl: string | null;
    portraitPhotoUrl: string | null;
  };
}
