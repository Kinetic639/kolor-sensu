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
import {
  specialistNow,
  upcomingVisits,
  weekDays,
  type PersonalWeekView,
} from "@repo/scheduling";
import { resourceColors } from "@repo/ui/resource-colors";
import { profileFacts } from "@repo/ui/public-site";
import { rosterWeekSummary } from "@repo/ui/resource-roster";
import type {
  SpecialistOffer,
  SpecialistRow,
  SpecialistState,
} from "@repo/ui/specialists";
import { categoryLabels } from "@/features/services/view-model";
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
      color: summary.color,
      joinedAt: summary.joinedAt,
      publicSlug: summary.publicSlug,
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

/** Their state, as the team's table filters and tags it. */
export function specialistState(
  item: Pick<
    SpecialistListItemViewModel,
    | "active"
    | "accountActive"
    | "acceptingNewClients"
    | "pendingDraft"
    | "publicationStatus"
  >,
): SpecialistState {
  return {
    // Working with the centre and able to sign in.
    active: item.active && item.accountActive,
    acceptingNewClients: item.acceptingNewClients,
    profile: item.pendingDraft
      ? "pending"
      : item.publicationStatus === "pending_review"
        ? "pending"
        : (item.publicationStatus ?? "none"),
  };
}

/** `od 03.2026` */
export function sinceLabel(joinedAt: string | null) {
  if (!joinedAt) return null;
  const [year, month] = joinedAt.split("-");
  return `od ${month}.${year}`;
}

/** A specialist as a row of the team's roster, with their week. */
export function toSpecialistRow(
  item: SpecialistListItemViewModel,
  week: PersonalWeekView,
): SpecialistRow {
  const state = specialistState(item);
  return {
    id: item.id,
    name: item.displayName,
    title: item.professionalTitle,
    initials: item.initials,
    avatarUrl: item.avatarUrl,
    color: item.color,
    href: `/specjalisci/${item.id}`,
    services: item.serviceCount,
    since: sinceLabel(item.joinedAt),
    slug: item.publicSlug,
    state,
    days: weekDays(week),
    occupancy: week.summary.occupancy,
    now: specialistNow(week, { active: state.active }),
    upcoming: upcomingVisits(week),
  };
}

/** The team's week in a line: `Zespół: 59 wizyt · 62% obłożenia`. */
export function teamWeekSummary(rows: Pick<SpecialistRow, "occupancy">[]) {
  return rosterWeekSummary(
    "Zespół",
    rows.map((row) => row.occupancy),
  );
}

/** Everyone's offers at their prices, by specialist. */
export function offersBySpecialist(
  offers: SpecialistService[],
  services: Service[],
): Record<string, SpecialistOffer[]> {
  const mapped = toSpecialistOffers(offers, services);
  const grouped: Record<string, SpecialistOffer[]> = {};
  offers.forEach((offer, index) => {
    (grouped[offer.specialistId] ??= []).push(mapped[index]!);
  });
  return grouped;
}

/** Their offers at their prices, in the order they were set up. */
export function toSpecialistOffers(
  offers: SpecialistService[],
  services: Service[],
): SpecialistOffer[] {
  const serviceById = new Map(services.map((service) => [service.id, service]));
  return offers.map((offer) => {
    const service = serviceById.get(offer.serviceId);
    const duration = offer.durationMinutes ?? service?.defaultDurationMinutes;
    return {
      id: offer.id,
      serviceName: service?.name ?? "Usługa niedostępna w katalogu",
      category: service ? categoryLabels[service.category] : null,
      price: new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: offer.currencyCode,
        maximumFractionDigits: offer.priceMinor % 100 ? 2 : 0,
      }).format(offer.priceMinor / 100),
      duration: duration ? `${duration} min` : "Nieustalony",
      inPerson: offer.supportsInPerson,
      online: offer.supportsOnline,
      active: offer.active,
      acceptingNewClients: offer.acceptingNewClients,
    };
  });
}

/** The state on their page (their tags), as on the team's list. */
export function detailState(detail: SpecialistDetailViewModel) {
  return specialistState({
    active: detail.active,
    accountActive: detail.accountActive,
    acceptingNewClients: detail.acceptingNewClients,
    pendingDraft: detail.draft?.status === "pending_review",
    publicationStatus: detail.publicProfile?.publicationStatus ?? null,
  });
}

/** `4 · od 195 zł`: the active offers and the lowest price; `Brak`. */
export function offerSummary(offers: SpecialistService[]) {
  const active = offers.filter((offer) => offer.active);
  if (!active.length) return offers.length ? "Wszystkie wyłączone" : "Brak";
  const lowest = active.reduce((low, offer) =>
    offer.priceMinor < low.priceMinor ? offer : low,
  );
  const price = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: lowest.currencyCode,
    maximumFractionDigits: lowest.priceMinor % 100 ? 2 : 0,
  }).format(lowest.priceMinor / 100);
  return `${active.length} · od ${price}`;
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
    offers: toSpecialistOffers(offers, services),
    offerSummary: offerSummary(offers),
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

/** The site's stand-in when a specialist has no picture yet. */
export const PORTRAIT_PLACEHOLDER = "/images/specjalista.svg";

/**
 * The profile as the site would show it: the published one, or the draft
 * waiting for review (asked for, or nothing published yet); none: neither.
 */
export function profilePreview(
  detail: SpecialistDetailViewModel,
  asked: "published" | "draft",
) {
  const version =
    asked === "draft" && detail.draft
      ? "draft"
      : detail.publicProfile
        ? "published"
        : detail.draft
          ? "draft"
          : null;
  if (!version) return null;
  const profile = version === "draft" ? detail.draft! : detail.publicProfile!;
  return {
    version,
    name: profile.displayName || detail.displayName,
    role: profile.professionalTitle ?? "Specjalista",
    photoUrl: profile.profilePhotoUrl,
    portraitSrc:
      profile.portraitPhotoUrl ??
      profile.profilePhotoUrl ??
      PORTRAIT_PLACEHOLDER,
    shortBio: profile.shortBio || null,
    longBio: profile.longBio,
    facts: profileFacts(profile),
    qualifications: [...profile.education, ...profile.certificates],
    acceptingNewClients: detail.acceptingNewClients,
    // What the site lists: the active offers.
    offers: detail.offers
      .filter((offer) => offer.active)
      .map((offer) => ({
        key: offer.id,
        name: offer.serviceName,
        meta: [
          offer.duration,
          [
            offer.inPerson ? "w gabinecie" : null,
            offer.online ? "online" : null,
          ]
            .filter(Boolean)
            .join(" lub "),
          offer.acceptingNewClients ? null : "bez nowych osób",
        ]
          .filter(Boolean)
          .join(" · "),
        price: offer.price,
      })),
  };
}

export type ProfilePreview = NonNullable<ReturnType<typeof profilePreview>>;
