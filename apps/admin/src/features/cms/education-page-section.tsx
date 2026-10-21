"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  educationPageContentSchema,
  type EducationPageContent,
} from "@repo/contracts";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateEducationPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Edukacja → its words: the top of /edukacja, the line while no article is
// published, the top of /edukacja/artykuly, and the word about therapy
// under every article. The articles themselves are in Artykuły.

export function EducationPageSection({
  model,
}: {
  model: ContentViewModel<EducationPageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<EducationPageContent>) =>
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
        const result = educationPageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateEducationPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek /edukacja" title="Tytuł strony">
        <IntroFields
          id="cms-education-intro"
          onChange={(intro) => change({ intro })}
          problems={asIntro(problems, "intro")}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="gdy nie ma jeszcze artykułów" title="Materiały wkrótce">
        <div className="px-3.5 py-3">
          <TextField
            id="cms-education-empty"
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
      <CmsSection note="nagłówek /edukacja/artykuly" title="Artykuły">
        <IntroFields
          id="cms-education-articles"
          onChange={(articlesIntro) => change({ articlesIntro })}
          problems={asIntro(problems, "articlesIntro")}
          value={draft.articlesIntro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="pod każdym artykułem" title="Informacja o terapii">
        <div className="px-3.5 py-3">
          <TextField
            hint="Obok jest zawsze link „Pomoc w kryzysie”."
            id="cms-education-therapy"
            invalid={problems.therapyNote}
            label="Tekst"
            maxLength={600}
            multiline
            onChange={(therapyNote) => change({ therapyNote })}
            rows={4}
            value={draft.therapyNote}
          />
        </div>
        {saveRow}
      </CmsSection>
    </form>
  );
}

/** A header's problems as IntroFields reads them (under `intro`). */
function asIntro(problems: Record<string, true>, key: string) {
  return Object.fromEntries(
    Object.keys(problems)
      .filter((path) => path === key || path.startsWith(`${key}.`))
      .map((path) => [`intro${path.slice(key.length)}`, true as const]),
  );
}
