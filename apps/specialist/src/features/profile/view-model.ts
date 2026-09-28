import {
  emptyRichTextDocument,
  type Specialist,
  type SpecialistProfileDraft,
  type SpecialistPublicProfile,
} from "@repo/contracts";
import type { ProfileEditorViewModel, ProfileFormValues } from "./types";

function pickContent(
  source: SpecialistProfileDraft | SpecialistPublicProfile,
  fallbackTitle: string | null,
): ProfileFormValues {
  return {
    displayName: source.displayName,
    professionalTitle: source.professionalTitle ?? fallbackTitle ?? "",
    shortBio: source.shortBio,
    longBio: source.longBio,
    profilePhotoUrl: source.profilePhotoUrl,
    portraitPhotoUrl: source.portraitPhotoUrl,
    languages: source.languages,
    therapyApproaches: source.therapyApproaches,
    specializations: source.specializations,
    education: source.education,
    certificates: source.certificates,
    modalities: source.modalities,
    clientGroups: source.clientGroups,
  };
}

function emptyContent(
  displayName: string,
  professionalTitle: string | null,
): ProfileFormValues {
  return {
    displayName,
    professionalTitle: professionalTitle ?? "",
    shortBio: "",
    longBio: emptyRichTextDocument,
    profilePhotoUrl: null,
    portraitPhotoUrl: null,
    languages: [],
    therapyApproaches: [],
    specializations: [],
    education: [],
    certificates: [],
    modalities: [],
    clientGroups: [],
  };
}

/**
 * The latest draft is edited while it is open (draft, waiting or rejected);
 * once approved, the published profile is the starting point of the next edit.
 */
export function mapProfileEditorViewModel({
  specialist,
  published,
  draft,
  fallbackName,
  media,
  webUrl,
}: {
  specialist: Specialist;
  published: SpecialistPublicProfile | null;
  draft: SpecialistProfileDraft | null;
  fallbackName: string;
  media: ProfileEditorViewModel["photoPreviews"];
  webUrl: string;
}): ProfileEditorViewModel {
  const openDraft = draft && draft.status !== "published" ? draft : null;
  const source = openDraft ?? published;
  const status = openDraft?.status ?? (published ? "published" : null);

  return {
    status,
    editable: status !== "pending_review",
    reviewComment:
      openDraft?.status === "rejected" ? openDraft.reviewComment : null,
    lastModified: source?.updatedAt ?? null,
    specialistId: specialist.id,
    publicUrl: published
      ? `${webUrl}/specjalisci/${specialist.publicSlug}`
      : null,
    values: source
      ? pickContent(source, specialist.professionalTitle)
      : emptyContent(fallbackName, specialist.professionalTitle),
    photoPreviews: media,
  };
}
