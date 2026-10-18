"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  homeThoughtsContentSchema,
  type HomeThoughtsContent,
} from "@repo/contracts";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateHomeThoughtsDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { linesToList, listToLines } from "./home-texts-editor";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Home → "Myśli, które się odmieniają", under the hero: a crowd of
// difficult thoughts, and kinder ones found under them. One thought per
// line; the band's name is read by screen readers. Saved as a draft.

interface Draft {
  label: string;
  negative: string;
  positive: string;
}

const toDraft = (content: HomeThoughtsContent): Draft => ({
  label: content.label,
  negative: listToLines(content.negative),
  positive: listToLines(content.positive),
});

const toContent = (draft: Draft) => ({
  label: draft.label,
  negative: linesToList(draft.negative),
  positive: linesToList(draft.positive),
});

export function ThoughtsSection({
  model,
}: {
  model: ContentViewModel<HomeThoughtsContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<Draft>(toDraft(model.content));
  const [saved, setSaved] = useState<Draft>(toDraft(model.content));
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty =
    JSON.stringify(toContent(draft)) !== JSON.stringify(toContent(saved));
  const change = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const count = (text: string) => linesToList(text).length;

  return (
    <CmsSection note="pas myśli pod hero" title="Myśli">
      <form
        className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = homeThoughtsContentSchema.safeParse(toContent(draft));
          if (!result.success) {
            setProblems(
              Object.fromEntries(
                result.error.issues.map((issue) => [
                  String(issue.path[0]),
                  true,
                ]),
              ),
            );
            toast.error("Popraw zaznaczone pola");
            return;
          }
          setProblems({});
          run(
            () => updateHomeThoughtsDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <TextField
          className="sm:col-span-2"
          hint="Czytniki ekranu czytają go zamiast trudnych myśli."
          id="cms-thoughts-label"
          invalid={problems.label}
          label="Nazwa pasa"
          maxLength={120}
          onChange={(label) => change({ label })}
          value={draft.label}
        />
        <TextField
          hint={`Jedna w linijce, od 8 do 40, krótkie (do 40 znaków). Teraz: ${count(draft.negative)}.`}
          id="cms-thoughts-negative"
          invalid={problems.negative}
          label="Trudne myśli"
          maxLength={2000}
          multiline
          onChange={(negative) => change({ negative })}
          rows={10}
          value={draft.negative}
        />
        <TextField
          hint={`Jedna w linijce, od 3 do 20 (do 60 znaków). Teraz: ${count(draft.positive)}.`}
          id="cms-thoughts-positive"
          invalid={problems.positive}
          label="Dobre myśli (pod spodem)"
          maxLength={1500}
          multiline
          onChange={(positive) => change({ positive })}
          rows={10}
          value={draft.positive}
        />
        <div className="sm:col-span-2">
          <SaveRow dirty={dirty} pending={isPending}>
            Zapisz szkic
          </SaveRow>
        </div>
      </form>
    </CmsSection>
  );
}
