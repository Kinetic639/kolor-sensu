"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  legalPageContentSchema,
  type LegalPageContent,
  type LegalPageKey,
} from "@repo/contracts/cms-legal";
import { RichTextEditor } from "@repo/ui/rich-text-editor";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateLegalPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// A legal document in the CMS (Regulamin, Polityka prywatności, Pliki
// cookies): the page's header, the date it applies from and the document
// itself in the portals' rich text editor (headings, lists, links).

export function LegalPageSection({
  page,
  model,
}: {
  page: LegalPageKey;
  model: ContentViewModel<LegalPageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<LegalPageContent>) =>
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
        const result = legalPageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateLegalPageDraftAction(page, result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id={`cms-${page}-intro`}
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="treść dokumentu" title="Dokument">
        <div className="grid gap-3 px-3.5 py-3">
          <TextField
            hint="Np. „1 listopada 2026”. Puste: bez daty."
            id={`cms-${page}-effective`}
            invalid={problems.effectiveFrom}
            label="Obowiązuje od"
            maxLength={60}
            onChange={(effectiveFrom) => change({ effectiveFrom })}
            value={draft.effectiveFrom}
          />
          <div className="grid gap-1.5">
            <p className="m-0 text-sm font-semibold text-[var(--text)]">
              Treść
            </p>
            <RichTextEditor
              ariaLabel="Treść dokumentu"
              onChange={(body) => change({ body })}
              placeholder="Treść dokumentu: śródtytuły, akapity, listy, linki…"
              value={draft.body}
            />
            {problems.body ? (
              <p className="m-0 text-xs text-[var(--danger)]" role="alert">
                Dokument nie może być pusty, a linki muszą być bezpieczne.
              </p>
            ) : (
              <p className="m-0 text-xs text-[var(--text-muted)]">
                Śródtytuły (H2, H3) układają dokument pod tytułem strony.
              </p>
            )}
          </div>
        </div>
        {saveRow}
      </CmsSection>
    </form>
  );
}
