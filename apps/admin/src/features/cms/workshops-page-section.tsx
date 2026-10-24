"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  workshopsPageContentSchema,
  type WorkshopsPageContent,
} from "@repo/contracts/cms-workshops";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateWorkshopsPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Warsztaty → its words (#210): the top and the line while no workshop is
// coming. The workshops themselves are the portal's (Warsztaty).

export function WorkshopsPageSection({
  model,
}: {
  model: ContentViewModel<WorkshopsPageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<WorkshopsPageContent>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const saveRow = (
    <div className="px-3.5 py-2.5">
      <SaveRow dirty={dirty} pending={isPending}>
        Zapisz szkic
      </SaveRow>
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = workshopsPageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateWorkshopsPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id="cms-workshops-intro"
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection
        note="gdy nie ma żadnego nadchodzącego warsztatu"
        title="Pusta lista"
      >
        <div className="px-3.5 py-3">
          <TextField
            id="cms-workshops-empty"
            invalid={problems.emptyText}
            label="Tekst"
            maxLength={400}
            multiline
            onChange={(emptyText) => change({ emptyText })}
            value={draft.emptyText}
          />
        </div>
        {saveRow}
      </CmsSection>
    </form>
  );
}
