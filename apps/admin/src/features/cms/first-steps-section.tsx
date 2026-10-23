"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  firstStepsContentSchema,
  type FirstStepsContent,
} from "@repo/contracts";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { type ReactNode, useState } from "react";
import { updateFirstStepsDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import type { FirstStepsViewModel } from "./types";

// Home → "Pierwszy krok": its header (the block above the form), whether
// the band shows and the four steps' names and sentences. The wave, the
// icons and the animation are the site's own. Saved as a draft; the page
// bar publishes.

function toContent(model: FirstStepsViewModel): FirstStepsContent {
  return {
    visible: model.visible,
    steps: model.steps.map(({ title, text }) => ({ title, text })),
  };
}

export function FirstStepsSection({
  content,
  header,
}: {
  content: FirstStepsViewModel;
  /** The section's header block (HeaderBlock), above its own form. */
  header?: ReactNode;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<FirstStepsContent>(() =>
    toContent(content),
  );
  const [saved, setSaved] = useState<FirstStepsContent>(() =>
    toContent(content),
  );
  // What the schema refuses, by field path ("steps.2.title").
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function change(patch: Partial<FirstStepsContent>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function changeStep(index: number, patch: { title?: string; text?: string }) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, at) =>
        at === index ? { ...step, ...patch } : step,
      ),
    }));
  }

  return (
    <CmsSection note="cztery kroki na malowanym pasie" title="Pierwszy krok">
      {header}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = firstStepsContentSchema.safeParse(draft);
          if (!result.success) {
            setProblems(
              Object.fromEntries(
                result.error.issues.map((issue) => [
                  issue.path.join("."),
                  true,
                ]),
              ),
            );
            toast.error("Uzupełnij zaznaczone pola");
            return;
          }
          setProblems({});
          run(
            () => updateFirstStepsDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <SwitchRow
          checked={draft.visible}
          description="Pas między obszarami wsparcia a sekcją specjalistów; maluje się przy przewijaniu."
          label="Pokaż sekcję"
          onCheckedChange={(visible) => change({ visible })}
        />
        <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
          {draft.steps.map((step, index) => (
            <fieldset
              className="grid content-start gap-1.5 rounded-[5px] border border-[var(--border)] p-2.5"
              key={index}
            >
              <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                Krok {index + 1}
              </legend>
              <Label htmlFor={`cms-steps-${index}-title`}>Nazwa</Label>
              <Input
                aria-invalid={
                  problems[`steps.${index}.title`] ? true : undefined
                }
                id={`cms-steps-${index}-title`}
                maxLength={40}
                onChange={(event) =>
                  changeStep(index, { title: event.target.value })
                }
                value={step.title}
              />
              <Label htmlFor={`cms-steps-${index}-text`}>Opis</Label>
              <Textarea
                aria-invalid={
                  problems[`steps.${index}.text`] ? true : undefined
                }
                id={`cms-steps-${index}-text`}
                maxLength={200}
                onChange={(event) =>
                  changeStep(index, { text: event.target.value })
                }
                rows={2}
                value={step.text}
              />
            </fieldset>
          ))}
          <SaveRow dirty={dirty} pending={isPending}>
            Zapisz szkic
          </SaveRow>
        </div>
      </form>
    </CmsSection>
  );
}
