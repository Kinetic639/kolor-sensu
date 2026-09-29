import type { AdminSpecialistSummary, PortalProfile } from "@repo/supabase";
import {
  clientGroupLabels,
  emptyRichTextDocument,
  personInitials,
  personName,
  plainTextFromRichText,
  type PersonName,
} from "@repo/contracts";
import type {
  Service,
  Specialist,
  SpecialistProfileDraft,
  SpecialistPublicProfile,
  SpecialistService,
} from "@repo/contracts";
import { resourceColors } from "@repo/ui/resource-colors";
import type { ResourceListItem } from "@repo/ui/resource-list";
import type {
  ProfileDiffFieldViewModel,
  SpecialistDetailViewModel,
  SpecialistListItemViewModel,
  SpecialistsListViewModel,
} from "./types";

/** From the first and last name when known, else the first two words. */
function getInitials(name: string, parts?: PersonName | null) {
  if (parts && personName(parts)) return personInitials(parts);
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

/**
 * `photos`: signed URLs of the published profile photos, by storage path
 * (the picture when the account has none).
 */
export function mapSpecialistsListViewModel(
  summaries: AdminSpecialistSummary[],
  photos: Map<string, string> = new Map(),
): SpecialistsListViewModel {
  const items: SpecialistListItemViewModel[] = summaries.map((summary) => {
    const colors = resourceColors(summary.color, summary.id);
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
      initials: getInitials(displayName, summary),
      accent: colors.accent,
      tint: colors.tint,
      avatarUrl:
        summary.avatarUrl ??
        (summary.publicProfilePhotoUrl
          ? (photos.get(summary.publicProfilePhotoUrl) ?? null)
          : null),
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

/** "1 usługa", "2 usługi", "5 usług", "22 usługi". */
function servicesLabel(count: number) {
  const tens = count % 100;
  const ones = count % 10;
  if (count === 1) return "1 usługa";
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) {
    return `${count} usługi`;
  }
  return `${count} usług`;
}

function profileStatus(
  item: SpecialistListItemViewModel,
): NonNullable<ResourceListItem["statuses"]>[number] {
  if (item.pendingDraft) return { label: "Do weryfikacji", tone: "warning" };
  switch (item.publicationStatus) {
    case "published":
      return { label: "Opublikowany", tone: "success" };
    case "rejected":
      return { label: "Odrzucony", tone: "danger" };
    case "draft":
      return { label: "Szkic", tone: "neutral" };
    default:
      return { label: "Brak profilu", tone: "neutral" };
  }
}

/** The specialists as rows of the admin list; the filters are their tags. */
export function toSpecialistListItems(
  items: SpecialistListItemViewModel[],
): ResourceListItem[] {
  return items.map((item) => {
    const active = item.active && item.accountActive;
    return {
      id: item.id,
      href: `/specjalisci/${item.id}`,
      name: item.displayName,
      description: item.professionalTitle,
      avatar: {
        url: item.avatarUrl,
        initials: item.initials,
        accent: item.accent,
        tint: item.tint,
      },
      facts: [servicesLabel(item.serviceCount)],
      statuses: [
        active
          ? { label: "Aktywny", tone: "success" }
          : { label: "Nieaktywny", tone: "neutral" },
        profileStatus(item),
      ],
      tags: [
        active ? "active" : "inactive",
        ...(item.pendingDraft ? ["pending"] : []),
      ],
      muted: !active,
    };
  });
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
    color: specialist.color,
    accent: resourceColors(specialist.color, specialist.id).accent,
    tint: resourceColors(specialist.color, specialist.id).tint,
    automaticAccent: resourceColors(null, specialist.id).accent,
    initials: getInitials(
      displayName,
      publicProfile ?? {
        firstName: identity.first_name,
        lastName: identity.last_name,
      },
    ),
    avatarUrl: media.publicProfilePhotoUrl ?? identity.avatar_url,
    professionalTitle: specialist.professionalTitle ?? "Tytuł nieuzupełniony",
    publicSlug: specialist.publicSlug,
    joinedAt: specialist.joinedAt,
    active: specialist.active,
    accountActive: identity.active,
    acceptingNewClients: specialist.acceptingNewClients,
    publicProfile: publicProfile
      ? {
          firstName: publicProfile.firstName,
          lastName: publicProfile.lastName,
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
          clientGroups: clientGroupLabels(publicProfile.clientGroups),
          publicationStatus: publicProfile.publicationStatus,
          publishedAt: publicProfile.publishedAt,
        }
      : null,
    draft: draft
      ? {
          id: draft.id,
          firstName: draft.firstName,
          lastName: draft.lastName,
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
          clientGroups: clientGroupLabels(draft.clientGroups),
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
    ["firstName", "Imię", current?.firstName, detail.draft.firstName],
    ["lastName", "Nazwisko", current?.lastName, detail.draft.lastName],
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
    [
      "clientGroups",
      "Z kim pracuje",
      current?.clientGroups,
      detail.draft.clientGroups,
    ],
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
