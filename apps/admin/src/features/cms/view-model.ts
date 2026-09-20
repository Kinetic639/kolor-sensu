import type { HomeContentAdmin } from "@repo/contracts";
import type { HomeContentViewModel } from "./types";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : null;
}

export function mapHomeContentViewModel(
  content: HomeContentAdmin,
): HomeContentViewModel {
  const hasUnpublishedChanges =
    !content.published ||
    content.published.heading !== content.draft.heading ||
    content.published.body !== content.draft.body ||
    content.published.buttonLabel !== content.draft.buttonLabel;

  return {
    heading: content.draft.heading,
    body: content.draft.body,
    buttonLabel: content.draft.buttonLabel,
    isPublished: content.published !== null,
    hasUnpublishedChanges,
    publishedAtLabel: formatDate(content.publishedAt),
    updatedAtLabel: formatDate(content.updatedAt) ?? "",
  };
}
