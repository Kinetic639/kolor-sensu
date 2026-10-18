"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import { whyUsContentSchema, type WhyUsContent } from "@repo/contracts";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { updateWhyUsDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import type { ContentViewModel } from "./types";

// Home → "Dlaczego my": its header (the block above the form), whether it
// shows and its two to four facts, each a title and a sentence. Saved as a
// draft; the page bar publishes.

const FACTS_MIN = 2;
const FACTS_MAX = 4;

export function WhyUsSection({
  model,
  header,
}: {
  model: ContentViewModel<WhyUsContent>;
  header?: ReactNode;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<WhyUsContent>(model.content);
  const [saved, setSaved] = useState<WhyUsContent>(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const facts = draft.facts;
  const setFacts = (next: readonly WhyUsContent["facts"][number][]) =>
    setDraft((current) => ({ ...current, facts: [...next] }));

  return (
    <CmsSection
      note="2–4 fakty o centrum, pod obszarami wsparcia"
      title="Dlaczego my"
    >
      {header}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = whyUsContentSchema.safeParse(draft);
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
            () => updateWhyUsDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <SwitchRow
          checked={draft.visible}
          description="Fakty o centrum pod obszarami wsparcia. Włącz, gdy treść jest zatwierdzona."
          label="Pokaż sekcję"
          onCheckedChange={(visible) =>
            setDraft((current) => ({ ...current, visible }))
          }
        />
        <ol className="grid gap-3.5 px-3.5 py-3">
          {facts.map((fact, index) => {
            const name = fact.title || `Fakt ${index + 1}`;
            return (
              <li key={index}>
                <fieldset className="grid gap-1.5 rounded-[5px] border border-[var(--border)] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                      Fakt {index + 1}
                    </legend>
                    <ListItemControls
                      canMoveDown={index < facts.length - 1}
                      canMoveUp={index > 0}
                      canRemove={facts.length > FACTS_MIN}
                      name={name}
                      onMove={(by) => setFacts(moveItem(facts, index, by))}
                      onRemove={() =>
                        setFacts(removeItem(facts, index, FACTS_MIN))
                      }
                    />
                  </div>
                  <Label htmlFor={`cms-why-${index}-title`}>Tytuł</Label>
                  <Input
                    aria-invalid={
                      problems[`facts.${index}.title`] ? true : undefined
                    }
                    id={`cms-why-${index}-title`}
                    maxLength={60}
                    onChange={(event) =>
                      setFacts(
                        facts.map((one, at) =>
                          at === index
                            ? { ...one, title: event.target.value }
                            : one,
                        ),
                      )
                    }
                    value={fact.title}
                  />
                  <Label htmlFor={`cms-why-${index}-text`}>Opis</Label>
                  <Textarea
                    aria-invalid={
                      problems[`facts.${index}.text`] ? true : undefined
                    }
                    id={`cms-why-${index}-text`}
                    maxLength={200}
                    onChange={(event) =>
                      setFacts(
                        facts.map((one, at) =>
                          at === index
                            ? { ...one, text: event.target.value }
                            : one,
                        ),
                      )
                    }
                    rows={2}
                    value={fact.text}
                  />
                </fieldset>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={facts.length >= FACTS_MAX}
            onClick={() =>
              setFacts(addItem(facts, { title: "", text: "" }, FACTS_MAX))
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj fakt
          </button>
          <div className="flex-1">
            <SaveRow dirty={dirty} pending={isPending}>
              Zapisz szkic
            </SaveRow>
          </div>
        </div>
      </form>
    </CmsSection>
  );
}
