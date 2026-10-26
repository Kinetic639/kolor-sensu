"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  WORKSHOP_RULES_MAX,
  workshopsPageContentSchema,
  type WorkshopsPageContent,
} from "@repo/contracts/cms-workshops";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateWorkshopsPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { linesToList, listToLines } from "./lines";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Warsztaty → its words (#210): the top, the line while no workshop is
// coming and the rules every workshop shares (#231, one per line). The
// workshops themselves are the portal's (Warsztaty).

type Draft = Omit<WorkshopsPageContent, "rules"> & { rules: string };

const toContent = ({ rules, ...draft }: Draft): WorkshopsPageContent => ({
  ...draft,
  rules: linesToList(rules),
});

export function WorkshopsPageSection({
  model,
}: {
  model: ContentViewModel<WorkshopsPageContent>;
}) {
  const { isPending, run } = useSave();
  const initial: Draft = {
    ...model.content,
    rules: listToLines(model.content.rules),
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty =
    JSON.stringify(toContent(draft)) !== JSON.stringify(toContent(saved));
  const change = (patch: Partial<Draft>) =>
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
        const result = workshopsPageContentSchema.safeParse(toContent(draft));
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
      <CmsSection
        note="na stronie każdego warsztatu, pod jego własnymi"
        title="Wspólne zasady"
      >
        <div className="px-3.5 py-3">
          <TextField
            hint={`Jedna w linijce, do ${WORKSHOP_RULES_MAX} (do 300 znaków). Termin zwrotu, płatność później i minimum osób każdy warsztat pokazuje sam. Teraz: ${linesToList(draft.rules).length}.`}
            id="cms-workshops-rules"
            invalid={Object.keys(problems).some((key) =>
              key.startsWith("rules"),
            )}
            label="Zasady"
            maxLength={2500}
            multiline
            onChange={(rules) => change({ rules })}
            rows={5}
            value={draft.rules}
          />
        </div>
        {saveRow}
      </CmsSection>
    </form>
  );
}
