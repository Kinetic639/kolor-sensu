import type { HomeStoryContent } from "@repo/contracts";
import type { HomeStoryStepRow } from "./types";

// Pure helpers for the homepage's word editors (thoughts-section.tsx,
// story-section.tsx), so the forms stay thin.

/** A textarea of one thought per line into the list the CMS keeps. */
export function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(list: readonly string[]): string {
  return list.join("\n");
}

/** A story step's button as its form holds it: both fields may be empty. */
export type StoryDraftStep = Omit<HomeStoryStepRow, "cta"> & {
  cta: { label: string; href: string } | null;
};

/**
 * The story's draft as saved: without the photos' addresses (previews
 * only), a button whose words and address are both empty meaning none.
 */
export function toStoryContent(
  steps: readonly StoryDraftStep[],
): HomeStoryContent {
  return {
    steps: steps.map(({ imageUrl: _preview, cta, ...step }) => ({
      ...step,
      cta: cta && (cta.label.trim() || cta.href.trim()) ? cta : null,
    })),
  };
}
