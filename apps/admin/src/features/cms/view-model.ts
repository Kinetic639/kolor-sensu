import type {
  FirstStepsContent,
  HomeContentAdmin,
  HomeHeadersContent,
  Service,
  HomeSectionsContent,
  HomeStoryContent,
  RoomsPageContent,
  SiteContentAdmin,
  SupportAreasContent,
} from "@repo/contracts";
import type { AdminSpecialistSummary } from "@repo/supabase";
import type {
  ContentViewModel,
  FirstStepsViewModel,
  HomeContentViewModel,
  HomeHeadersViewModel,
  HomeSectionsViewModel,
  HomeStoryStepRow,
  RoomsPageViewModel,
  SupportAreasViewModel,
} from "./types";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : null;
}

export function mapHomeContentViewModel(
  content: HomeContentAdmin,
  imageUrl: (path: string) => string,
): HomeContentViewModel {
  const { draft, published } = content;
  return {
    ...draft,
    imageUrl: draft.imagePath ? imageUrl(draft.imagePath) : null,
    isPublished: published !== null,
    hasUnpublishedChanges:
      !published || JSON.stringify(published) !== JSON.stringify(draft),
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

export function mapRoomsPageViewModel(
  content: SiteContentAdmin<RoomsPageContent>,
): RoomsPageViewModel {
  const { draft, published } = content;
  return {
    ...draft,
    isPublished: published !== null,
    hasUnpublishedChanges:
      !published || JSON.stringify(published) !== JSON.stringify(draft),
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

export function mapSupportAreasViewModel(
  content: SiteContentAdmin<SupportAreasContent>,
  imageUrl: (path: string) => string,
): SupportAreasViewModel {
  const { draft, published } = content;
  return {
    areas: draft.areas.map((area) => ({
      ...area,
      imageUrl: area.imagePath ? imageUrl(area.imagePath) : null,
    })),
    isPublished: published !== null,
    hasUnpublishedChanges:
      !published || JSON.stringify(published) !== JSON.stringify(draft),
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

export function mapHomeSectionsViewModel(
  content: SiteContentAdmin<HomeSectionsContent>,
  imageUrl: (path: string) => string,
  specialists: readonly AdminSpecialistSummary[],
): HomeSectionsViewModel {
  const { draft, published } = content;
  return {
    showSpecialists: draft.showSpecialists,
    spotlight: {
      ...draft.spotlight,
      imageUrl: draft.spotlight.imagePath
        ? imageUrl(draft.spotlight.imagePath)
        : null,
    },
    specialists: specialists.map((specialist) => ({
      id: specialist.id,
      name:
        specialist.publicDisplayName ??
        `${specialist.firstName} ${specialist.lastName}`,
      onSite: specialist.active && specialist.publicationStatus === "published",
    })),
    isPublished: published !== null,
    hasUnpublishedChanges:
      !published || JSON.stringify(published) !== JSON.stringify(draft),
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

export interface PageStatus {
  /** Every section of the page has been published at least once. */
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAtLabel: string | null;
  updatedAtLabel: string | null;
}

const latest = (dates: (string | null)[]) =>
  dates.reduce<string | null>(
    (last, date) => (date && (!last || date > last) ? date : last),
    null,
  );

/** One page's status from its sections' (those that loaded). */
export function pageStatus(
  sections: readonly {
    isPublished: boolean;
    hasUnpublishedChanges: boolean;
    publishedAt: string | null;
    updatedAt: string;
  }[],
): PageStatus {
  return {
    isPublished:
      sections.length > 0 && sections.every((section) => section.isPublished),
    hasUnpublishedChanges: sections.some(
      (section) => section.hasUnpublishedChanges,
    ),
    publishedAtLabel: formatDate(
      latest(sections.map((section) => section.publishedAt)),
    ),
    updatedAtLabel: formatDate(
      latest(sections.map((section) => section.updatedAt)),
    ),
  };
}

export function mapHomeHeadersViewModel(
  content: SiteContentAdmin<HomeHeadersContent>,
  services: readonly Service[],
): HomeHeadersViewModel {
  const { draft, published } = content;
  return {
    headers: draft,
    // What a header may book: the services clients can book on the site.
    services: services
      .filter(
        (service) =>
          service.active && service.publiclyVisible && service.bookingEnabled,
      )
      .map(({ slug, name, requiresIntake }) => ({
        slug,
        name,
        requiresIntake,
      })),
    isPublished: published !== null,
    hasUnpublishedChanges:
      !published || JSON.stringify(published) !== JSON.stringify(draft),
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

export function mapFirstStepsViewModel(
  content: SiteContentAdmin<FirstStepsContent>,
): FirstStepsViewModel {
  const { draft, published } = content;
  return {
    ...draft,
    isPublished: published !== null,
    hasUnpublishedChanges:
      !published || JSON.stringify(published) !== JSON.stringify(draft),
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

/**
 * A section whose draft the editor shows as it is ("Dlaczego my", the
 * newsletter band, "Gdzie jesteśmy", the crisis strip), with whether it
 * is published and differs from what is.
 */
export function mapContentViewModel<Content>(
  content: SiteContentAdmin<Content>,
): ContentViewModel<Content> {
  const { draft, published } = content;
  return {
    content: draft,
    isPublished: published !== null,
    hasUnpublishedChanges:
      !published || JSON.stringify(published) !== JSON.stringify(draft),
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
}

/** The story's steps, each with its photo's address to preview. */
export function mapHomeStoryViewModel(
  content: SiteContentAdmin<HomeStoryContent>,
  imageUrl: (path: string) => string,
): ContentViewModel<{ steps: HomeStoryStepRow[] }> {
  const model = mapContentViewModel(content);
  return {
    ...model,
    content: {
      steps: content.draft.steps.map((step) => ({
        ...step,
        imageUrl: step.imagePath ? imageUrl(step.imagePath) : null,
      })),
    },
  };
}
