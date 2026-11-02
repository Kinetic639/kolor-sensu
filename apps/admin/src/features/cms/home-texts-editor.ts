import {
  HOME_THOUGHT_PAIRS_MAX,
  HOME_THOUGHT_PAIRS_MIN,
  homeThoughtsContentSchema,
  type HomeStoryContent,
  type HomeThoughtsContent,
} from "@repo/contracts";
import type { HomeStoryStepRow } from "./types";
import { draftToLine, type TitleLineDraft } from "./header-editor";

// Pure helpers for the homepage's word editors (thoughts-section.tsx,
// story-section.tsx), so the forms stay thin.

/**
 * What is wrong with the thoughts: by field ("label", "3.negative",
 * "3.positive"), and "list" for how many pairs there are.
 */
export type ThoughtsProblems = Record<string, string>;

const thoughtMessages: Record<string, string> = {
  label: "Wpisz nazwę pasa (do 120 znaków).",
  negative: "Wpisz trudną myśl (do 40 znaków).",
  positive: "Wpisz myśl, w którą się zamienia (do 60 znaków).",
};

/** The fields the CMS would refuse, each with what to do about it. */
export function thoughtsProblemsOf(
  content: HomeThoughtsContent,
): ThoughtsProblems {
  const result = homeThoughtsContentSchema.safeParse(content);
  if (result.success) return {};
  const problems: ThoughtsProblems = {};
  for (const issue of result.error.issues) {
    const [top, index, field] = issue.path;
    if (top === "label") {
      problems.label ??= thoughtMessages.label!;
    } else if (index === undefined) {
      problems.list ??= `Potrzeba od ${HOME_THOUGHT_PAIRS_MIN} do ${HOME_THOUGHT_PAIRS_MAX} par, żeby wypełnić pas.`;
    } else {
      const name = String(field);
      problems[`${String(index)}.${name}`] ??=
        thoughtMessages[name] ?? issue.message;
    }
  }
  return problems;
}

/** A new, empty pair at the end of the list. */
export const emptyThoughtPair = { negative: "", positive: "" } as const;

/** A story step's button as its form holds it: both fields may be empty. */
export type StoryDraftStep = Omit<HomeStoryStepRow, "cta"> & {
  cta: { label: string; href: string } | null;
  headingDraft?: TitleLineDraft;
};

/**
 * The story's draft as saved: without the photos' addresses (previews
 * only), a button whose words and address are both empty meaning none.
 */
export function toStoryContent(
  steps: readonly StoryDraftStep[],
): HomeStoryContent {
  return {
    steps: steps.map(({ imageUrl: _preview, headingDraft, cta, ...step }) => ({
      ...step,
      ...(headingDraft
        ? {
            heading: headingDraft.text.trim(),
            headingSegments: draftToLine(headingDraft).length
              ? draftToLine(headingDraft)
              : undefined,
          }
        : {}),
      cta: cta && (cta.label.trim() || cta.href.trim()) ? cta : null,
    })),
  };
}
