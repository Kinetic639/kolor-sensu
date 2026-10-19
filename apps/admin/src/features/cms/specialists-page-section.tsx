"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  specialistsPageContentSchema,
  type SpecialistsPageContent,
} from "@repo/contracts";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateSpecialistsPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Specjaliści → its words: the top, the line while no profile is published,
// and the closing banner's line ("Nie wiesz, do kogo się zapisać?"). The
// cards themselves come from the specialists' profiles.

export function SpecialistsPageSection({
  model,
}: {
  model: ContentViewModel<SpecialistsPageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<SpecialistsPageContent>) =>
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
        const result = specialistsPageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateSpecialistsPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id="cms-specialists-intro"
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection
        note="gdy nikt nie jest jeszcze na stronie"
        title="Pusta lista"
      >
        <div className="px-3.5 py-3">
          <TextField
            id="cms-specialists-empty"
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
      <CmsSection note="na końcu listy" title="Pomożemy wybrać">
        <div className="px-3.5 py-3">
          <TextField
            hint="Przyciski „Umów wizytę” i „Skontaktuj się” są z Ustawień wspólnych."
            id="cms-specialists-help"
            invalid={problems.helpHeading}
            label="Nagłówek banera"
            maxLength={120}
            onChange={(helpHeading) => change({ helpHeading })}
            value={draft.helpHeading}
          />
        </div>
        {saveRow}
      </CmsSection>
    </form>
  );
}
