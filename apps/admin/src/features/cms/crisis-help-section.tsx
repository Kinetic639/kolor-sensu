"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  crisisHelpContentSchema,
  type CrisisHelpContent,
} from "@repo/contracts";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { useState } from "react";
import { updateCrisisHelpDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import type { ContentViewModel } from "./types";

// Home → the crisis strip: its heading, its sentence and one to six lines
// to call (number, whom it reaches, when). Always shown on the site: the
// admin approves the words and numbers, never hides the strip. Saved as a
// draft; the page bar publishes.

const LINES_MIN = 1;
const LINES_MAX = 6;

type Line = CrisisHelpContent["lines"][number];

export function CrisisHelpSection({
  model,
}: {
  model: ContentViewModel<CrisisHelpContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<CrisisHelpContent>(model.content);
  const [saved, setSaved] = useState<CrisisHelpContent>(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const lines = draft.lines;
  const setLines = (next: readonly Line[]) =>
    setDraft((current) => ({ ...current, lines: [...next] }));
  const changeLine = (index: number, patch: Partial<Line>) =>
    setLines(
      lines.map((line, at) => (at === index ? { ...line, ...patch } : line)),
    );
  const invalid = (path: string) => (problems[path] ? true : undefined);

  return (
    <CmsSection
      note="zawsze widoczny; numery dzwonią po kliknięciu"
      title="Pomoc w kryzysie"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = crisisHelpContentSchema.safeParse(draft);
          if (!result.success) {
            setProblems(
              Object.fromEntries(
                result.error.issues.map((issue) => [
                  issue.path.join("."),
                  true,
                ]),
              ),
            );
            toast.error(
              "Uzupełnij zaznaczone pola. Numer to cyfry i spacje, plus tylko na początku.",
            );
            return;
          }
          setProblems({});
          run(
            () => updateCrisisHelpDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <div className="grid gap-1.5 px-3.5 py-3">
          <Label htmlFor="cms-crisis-eyebrow">
            Napis nad nagłówkiem (opcjonalnie)
          </Label>
          <Input
            id="cms-crisis-eyebrow"
            maxLength={60}
            aria-invalid={invalid("eyebrow")}
            value={draft.eyebrow}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                eyebrow: event.target.value,
              }))
            }
          />
          <Label htmlFor="cms-crisis-heading">Nagłówek</Label>
          <Input
            aria-invalid={invalid("heading")}
            id="cms-crisis-heading"
            maxLength={80}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                heading: event.target.value,
              }))
            }
            value={draft.heading}
          />
          <Label htmlFor="cms-crisis-text">Zdanie pod nagłówkiem</Label>
          <Textarea
            aria-invalid={invalid("text")}
            id="cms-crisis-text"
            maxLength={200}
            onChange={(event) =>
              setDraft((current) => ({ ...current, text: event.target.value }))
            }
            rows={2}
            value={draft.text}
          />
          <Label htmlFor="cms-crisis-more">
            Tekst linku do pomocy w kryzysie
          </Label>
          <Input
            id="cms-crisis-more"
            maxLength={80}
            aria-invalid={invalid("moreLabel")}
            value={draft.moreLabel}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                moreLabel: event.target.value,
              }))
            }
          />
        </div>
        <ol className="grid gap-3.5 px-3.5 py-3">
          {lines.map((line, index) => {
            const name = line.number || `Linia ${index + 1}`;
            return (
              <li key={index}>
                <fieldset className="grid gap-1.5 rounded-[5px] border border-[var(--border)] p-2.5 sm:grid-cols-3">
                  <div className="flex items-center justify-between gap-2 sm:col-span-3">
                    <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                      Linia {index + 1}
                    </legend>
                    <ListItemControls
                      canMoveDown={index < lines.length - 1}
                      canMoveUp={index > 0}
                      canRemove={lines.length > LINES_MIN}
                      name={name}
                      onMove={(by) => setLines(moveItem(lines, index, by))}
                      onRemove={() =>
                        setLines(removeItem(lines, index, LINES_MIN))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`cms-crisis-${index}-number`}>Numer</Label>
                    <Input
                      aria-invalid={invalid(`lines.${index}.number`)}
                      id={`cms-crisis-${index}-number`}
                      inputMode="tel"
                      maxLength={20}
                      onChange={(event) =>
                        changeLine(index, { number: event.target.value })
                      }
                      value={line.number}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`cms-crisis-${index}-label`}>Do kogo</Label>
                    <Input
                      aria-invalid={invalid(`lines.${index}.label`)}
                      id={`cms-crisis-${index}-label`}
                      maxLength={80}
                      onChange={(event) =>
                        changeLine(index, { label: event.target.value })
                      }
                      value={line.label}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`cms-crisis-${index}-detail`}>
                      Kiedy (opcjonalnie)
                    </Label>
                    <Input
                      aria-invalid={invalid(`lines.${index}.detail`)}
                      id={`cms-crisis-${index}-detail`}
                      maxLength={80}
                      onChange={(event) =>
                        changeLine(index, { detail: event.target.value })
                      }
                      value={line.detail}
                    />
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={lines.length >= LINES_MAX}
            onClick={() =>
              setLines(
                addItem(
                  lines,
                  { number: "", label: "", detail: "" },
                  LINES_MAX,
                ),
              )
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj numer
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
