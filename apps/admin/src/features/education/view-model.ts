import {
  TEAM_AUTHOR_NAME,
  type ArticleCategory,
  type ArticleDraft,
  type EbookDraft,
  type EducationAdminRow,
} from "@repo/contracts/education";
import { matchesSearch } from "@repo/ui/resource-roster";

// Edukacja's lists in the portal: what each row says (title, category,
// author, state), the segments (all, drafts, published, with changes not
// yet published) with their counts, and the search and category filter.
// Pure: the pages and their tests share it.

export const EDUCATION_SEGMENTS = [
  "wszystkie",
  "szkice",
  "opublikowane",
  "zmiany",
] as const;

export type EducationSegment = (typeof EDUCATION_SEGMENTS)[number];

export const SEGMENT_LABELS: Record<EducationSegment, string> = {
  wszystkie: "Wszystkie",
  szkice: "Szkice",
  opublikowane: "Opublikowane",
  zmiany: "Ze zmianami",
};

type AnyRow = EducationAdminRow<{ title: string }>;

/** Whether a row belongs to a segment. */
export function inSegment(row: AnyRow, segment: EducationSegment): boolean {
  switch (segment) {
    case "wszystkie":
      return true;
    case "szkice":
      return row.status === "draft";
    case "opublikowane":
      return row.status === "published";
    case "zmiany":
      return row.status === "published" && row.hasUnpublishedChanges;
  }
}

export function segmentCounts(
  rows: readonly AnyRow[],
): Record<EducationSegment, number> {
  return Object.fromEntries(
    EDUCATION_SEGMENTS.map((segment) => [
      segment,
      rows.filter((row) => inSegment(row, segment)).length,
    ]),
  ) as Record<EducationSegment, number>;
}

export interface StateTag {
  label: string;
  tone: "neutral" | "success" | "warning";
}

/** A row's state as the list and the page's bar say it. */
export function stateOf(
  row: Pick<AnyRow, "status" | "hasUnpublishedChanges">,
): StateTag {
  if (row.status === "draft") return { label: "Szkic", tone: "neutral" };
  return row.hasUnpublishedChanges
    ? { label: "Opublikowany · są zmiany", tone: "warning" }
    : { label: "Opublikowany", tone: "success" };
}

export const untitled = (title: string) => title.trim() || "Bez tytułu";

export interface SpecialistOption {
  id: string;
  name: string;
}

export interface ArticleListRow {
  id: string;
  title: string;
  category: string | null;
  author: string;
  state: StateTag;
  updatedAt: string;
}

/** Who signs an article, as the list says it. */
export function authorName(
  draft: Pick<ArticleDraft, "authorKind" | "authorSpecialistId">,
  specialists: readonly SpecialistOption[],
): string {
  if (draft.authorKind === "team") return TEAM_AUTHOR_NAME;
  return (
    specialists.find((one) => one.id === draft.authorSpecialistId)?.name ??
    "Autor nie wybrany"
  );
}

export interface ArticleFilter {
  segment: EducationSegment;
  /** A category's id, or null for every category. */
  category: string | null;
  query: string | null;
}

/** The articles' list, filtered: segment, category, search. */
export function articleList(
  rows: readonly EducationAdminRow<ArticleDraft>[],
  categories: readonly ArticleCategory[],
  specialists: readonly SpecialistOption[],
  filter: ArticleFilter,
): ArticleListRow[] {
  const matches = matchesSearch(filter.query);
  return rows
    .filter((row) => inSegment(row, filter.segment))
    .filter(
      (row) => !filter.category || row.draft.categoryId === filter.category,
    )
    .map((row) => ({
      id: row.id,
      title: untitled(row.draft.title),
      category:
        categories.find((one) => one.id === row.draft.categoryId)?.name ?? null,
      author: authorName(row.draft, specialists),
      state: stateOf(row),
      updatedAt: row.updatedAt,
    }))
    .filter((row) =>
      matches(`${row.title} ${row.category ?? ""} ${row.author}`),
    );
}

export interface EbookListRow {
  id: string;
  title: string;
  state: StateTag;
  updatedAt: string;
}

export function ebookList(
  rows: readonly EducationAdminRow<EbookDraft>[],
  filter: Omit<ArticleFilter, "category">,
): EbookListRow[] {
  const matches = matchesSearch(filter.query);
  return rows
    .filter((row) => inSegment(row, filter.segment))
    .map((row) => ({
      id: row.id,
      title: untitled(row.draft.title),
      state: stateOf(row),
      updatedAt: row.updatedAt,
    }))
    .filter((row) => matches(row.title));
}

/**
 * The address follows the title while it has not been changed by hand
 * (and the article was never published: then the address is kept).
 */
export function followsTitle(
  slug: string,
  previousTitleSlug: string,
  published: boolean,
): boolean {
  return !published && (slug === previousTitleSlug || slug.startsWith("nowy-"));
}
