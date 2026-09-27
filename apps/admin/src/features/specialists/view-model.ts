import type { AdminSpecialistSummary, PortalProfile } from "@repo/supabase";
import { emptyRichTextDocument, plainTextFromRichText } from "@repo/contracts";
import type {
  Service,
  Specialist,
  SpecialistProfileDraft,
  SpecialistPublicProfile,
  SpecialistService,
} from "@repo/contracts";
import type {
  ProfileDiffFieldViewModel,
  SpecialistDetailViewModel,
  SpecialistListItemViewModel,
  SpecialistsListViewModel,
} from "./types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getIdentityName({
  firstName,
  lastName,
  fallback,
}: {
  firstName: string;
  lastName: string;
  fallback: string;
}) {
  return [firstName, lastName].filter(Boolean).join(" ") || fallback;
}

export function mapSpecialistsListViewModel(
  summaries: AdminSpecialistSummary[],
): SpecialistsListViewModel {
  const items: SpecialistListItemViewModel[] = summaries.map((summary) => {
    const displayName =
      summary.publicDisplayName ||
      getIdentityName({
        firstName: summary.firstName,
        lastName: summary.lastName,
        fallback: summary.publicSlug,
      });

    return {
      id: summary.id,
      displayName,
      initials: getInitials(displayName),
      avatarUrl: summary.avatarUrl,
      professionalTitle: summary.professionalTitle ?? "Tytuł nieuzupełniony",
      active: summary.active,
      accountActive: summary.accountActive,
      acceptingNewClients: summary.acceptingNewClients,
      publicationStatus: summary.publicationStatus,
      serviceCount: summary.serviceCount,
      pendingDraft: Boolean(summary.pendingDraftId),
      pendingDraftSubmittedAt: summary.pendingDraftSubmittedAt,
    };
  });

  return {
    items,
    totalCount: items.length,
    activeCount: items.filter((item) => item.active && item.accountActive)
      .length,
    pendingReviewCount: items.filter((item) => item.pendingDraft).length,
  };
}

export function mapSpecialistDetailViewModel({
  specialist,
  identity,
  publicProfile,
  draft,
  services,
  offers,
  media,
}: {
  specialist: Specialist;
  identity: PortalProfile;
  publicProfile: SpecialistPublicProfile | null;
  draft: SpecialistProfileDraft | null;
  services: Service[];
  offers: SpecialistService[];
  media: {
    publicProfilePhotoUrl: string | null;
    publicPortraitPhotoUrl: string | null;
    draftProfilePhotoUrl: string | null;
    draftPortraitPhotoUrl: string | null;
  };
}): SpecialistDetailViewModel {
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const displayName =
    publicProfile?.displayName ||
    getIdentityName({
      firstName: identity.first_name,
      lastName: identity.last_name,
      fallback: specialist.publicSlug,
    });

  return {
    id: specialist.id,
    userId: specialist.userId,
    displayName,
    initials: getInitials(displayName),
    avatarUrl: media.publicProfilePhotoUrl ?? identity.avatar_url,
    professionalTitle: specialist.professionalTitle ?? "Tytuł nieuzupełniony",
    publicSlug: specialist.publicSlug,
    joinedAt: specialist.joinedAt,
    active: specialist.active,
    accountActive: identity.active,
    acceptingNewClients: specialist.acceptingNewClients,
    publicProfile: publicProfile
      ? {
          displayName: publicProfile.displayName,
          professionalTitle: publicProfile.professionalTitle,
          shortBio: publicProfile.shortBio,
          longBio: publicProfile.longBio,
          profilePhotoUrl: media.publicProfilePhotoUrl,
          portraitPhotoUrl: media.publicPortraitPhotoUrl,
          profilePhotoPath: publicProfile.profilePhotoUrl,
          portraitPhotoPath: publicProfile.portraitPhotoUrl,
          languages: publicProfile.languages,
          therapyApproaches: publicProfile.therapyApproaches,
          specializations: publicProfile.specializations,
          education: publicProfile.education,
          certificates: publicProfile.certificates,
          modalities: publicProfile.modalities,
          publicationStatus: publicProfile.publicationStatus,
          publishedAt: publicProfile.publishedAt,
        }
      : null,
    draft: draft
      ? {
          id: draft.id,
          displayName: draft.displayName,
          professionalTitle: draft.professionalTitle,
          shortBio: draft.shortBio,
          longBio: draft.longBio,
          profilePhotoUrl: media.draftProfilePhotoUrl,
          portraitPhotoUrl: media.draftPortraitPhotoUrl,
          profilePhotoPath: draft.profilePhotoUrl,
          portraitPhotoPath: draft.portraitPhotoUrl,
          languages: draft.languages,
          therapyApproaches: draft.therapyApproaches,
          specializations: draft.specializations,
          education: draft.education,
          certificates: draft.certificates,
          modalities: draft.modalities,
          status: draft.status,
          submittedAt: draft.submittedAt,
          reviewComment: draft.reviewComment,
        }
      : null,
    offers: offers.map((offer) => {
      const service = serviceById.get(offer.serviceId);
      const duration = offer.durationMinutes ?? service?.defaultDurationMinutes;
      return {
        id: offer.id,
        serviceName: service?.name ?? "Usługa niedostępna w katalogu",
        priceLabel: new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: offer.currencyCode,
        }).format(offer.priceMinor / 100),
        durationLabel: duration ? `${duration} min` : "Nieustalony",
        supportsInPerson: offer.supportsInPerson,
        supportsOnline: offer.supportsOnline,
        active: offer.active,
        acceptingNewClients: offer.acceptingNewClients,
      };
    }),
  };
}

function stringifyProfileValue(value: string | string[] | null) {
  if (Array.isArray(value)) return value.join(", ") || "Brak";
  return value?.trim() || "Brak";
}

export function createProfileDiff(
  detail: SpecialistDetailViewModel,
): ProfileDiffFieldViewModel[] {
  if (!detail.draft) return [];
  const current = detail.publicProfile;
  const fields = [
    [
      "displayName",
      "Nazwa publiczna",
      current?.displayName,
      detail.draft.displayName,
    ],
    [
      "professionalTitle",
      "Tytuł zawodowy",
      current?.professionalTitle,
      detail.draft.professionalTitle,
    ],
    ["shortBio", "Krótki opis", current?.shortBio, detail.draft.shortBio, true],
    ["languages", "Języki", current?.languages, detail.draft.languages],
    [
      "therapyApproaches",
      "Podejścia terapeutyczne",
      current?.therapyApproaches,
      detail.draft.therapyApproaches,
    ],
    [
      "specializations",
      "Specjalizacje",
      current?.specializations,
      detail.draft.specializations,
    ],
    ["modalities", "Formy pracy", current?.modalities, detail.draft.modalities],
    ["education", "Wykształcenie", current?.education, detail.draft.education],
    [
      "certificates",
      "Certyfikaty",
      current?.certificates,
      detail.draft.certificates,
    ],
  ] as const;

  const textFields = fields.map(
    ([id, label, currentValue, proposedValue, multiline]) => {
      const currentLabel = stringifyProfileValue(currentValue ?? null);
      const proposedLabel = stringifyProfileValue(proposedValue);
      return {
        id,
        label,
        currentValue: currentLabel,
        proposedValue: proposedLabel,
        changed: currentLabel !== proposedLabel,
        multiline,
      };
    },
  );

  const draft = detail.draft;
  // The bio is rich text: compared as a document (formatting counts), shown
  // as its text.
  const currentBio = current?.longBio ?? emptyRichTextDocument;
  const currentBioText = plainTextFromRichText(currentBio);
  const proposedBioText = plainTextFromRichText(draft.longBio);
  const bioChanged =
    JSON.stringify(currentBio) !== JSON.stringify(draft.longBio);
  const bioField = {
    id: "longBio",
    label: "Pełny opis",
    currentValue: currentBioText || "Brak",
    proposedValue:
      (proposedBioText || "Brak") +
      (bioChanged && currentBioText === proposedBioText
        ? " (zmienione formatowanie)"
        : ""),
    changed: bioChanged,
    multiline: true,
  };

  const photoFields = (
    [
      [
        "profilePhoto",
        "Zdjęcie profilowe",
        "profilePhotoPath",
        "profilePhotoUrl",
      ],
      [
        "portraitPhoto",
        "Zdjęcie portretowe",
        "portraitPhotoPath",
        "portraitPhotoUrl",
      ],
    ] as const
  ).map(([id, label, pathKey, urlKey]) => {
    const currentPath = current?.[pathKey] ?? null;
    const proposedPath = draft[pathKey];
    return {
      id,
      label,
      currentValue: currentPath ? "Obecne zdjęcie" : "Brak zdjęcia",
      proposedValue: proposedPath
        ? currentPath === proposedPath
          ? "Obecne zdjęcie"
          : "Nowe zdjęcie"
        : currentPath
          ? "Zdjęcie usunięte"
          : "Brak zdjęcia",
      changed: currentPath !== proposedPath,
      currentImageUrl: current?.[urlKey] ?? null,
      proposedImageUrl: draft[urlKey],
    };
  });

  return [...photoFields, ...textFields, bioField];
}
