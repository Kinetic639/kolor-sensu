"use client";

import type { ProfileReviewDiffField } from "@repo/ui/specialist-admin";
import { DraftReview } from "@repo/ui/specialists";
import { reviewSpecialistDraftAction } from "./actions";

// The draft waiting for review, on the profile tab: one line on the page,
// the changes and the decision in a dialog (@repo/ui). Approved, it
// replaces the published profile; rejected, with a reason. The page
// renders again with the outcome.

export function SpecialistDraftReview({
  specialistId,
  draftId,
  name,
  submitted,
  fields,
}: {
  specialistId: string;
  draftId: string;
  name: string;
  submitted?: string;
  fields: ProfileReviewDiffField[];
}) {
  return (
    <DraftReview
      fields={fields}
      name={name}
      review={(action, comment) =>
        reviewSpecialistDraftAction({ specialistId, draftId, action, comment })
      }
      submitted={submitted}
    />
  );
}
