"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  HOME_THOUGHT_PAIRS_MAX,
  HOME_THOUGHT_PAIRS_MIN,
  homeThoughtsContentSchema,
  type HomeThoughtPair,
  type HomeThoughtsContent,
} from "@repo/contracts";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { useState } from "react";
import { updateHomeThoughtsDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import {
  emptyThoughtPair,
  thoughtsProblemsOf,
  type ThoughtsProblems,
} from "./home-texts-editor";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Home → "Myśli, które się odmieniają", under the hero: a crowd of
// difficult thoughts, each in a row with the kinder one it turns into when
// pointed at. Rows are added, removed and moved; the band's name is read
// by screen readers. Saved as a draft; the page bar publishes.

function Problem({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p className="text-[0.75rem] text-[var(--danger)]" id={id}>
      {text}
    </p>
  );
}

function PairField({
  id,
  label,
  value,
  maxLength,
  problem,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  problem?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={problem ? `${id}-problem` : undefined}
        aria-invalid={problem ? true : undefined}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <Problem id={`${id}-problem`} text={problem} />
    </div>
  );
}

export function ThoughtsSection({
  model,
}: {
  model: ContentViewModel<HomeThoughtsContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<HomeThoughtsContent>(model.content);
  const [saved, setSaved] = useState<HomeThoughtsContent>(model.content);
  const [problems, setProblems] = useState<ThoughtsProblems>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const pairs = draft.pairs;

  // Once the admin has tried to save, the marks follow every change, so a
  // fixed field clears at once.
  function change(next: HomeThoughtsContent) {
    setDraft(next);
    if (Object.keys(problems).length > 0) setProblems(thoughtsProblemsOf(next));
  }
  const setPairs = (next: readonly HomeThoughtPair[]) =>
    change({ ...draft, pairs: [...next] });
  const changePair = (index: number, patch: Partial<HomeThoughtPair>) =>
    setPairs(
      pairs.map((pair, at) => (at === index ? { ...pair, ...patch } : pair)),
    );

  return (
    <CmsSection
      note={`pas myśli pod hero · ${pairs.length} z ${HOME_THOUGHT_PAIRS_MAX}`}
      title="Myśli"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const found = thoughtsProblemsOf(draft);
          setProblems(found);
          const result = homeThoughtsContentSchema.safeParse(draft);
          if (!result.success) {
            toast.error("Popraw zaznaczone pola");
            return;
          }
          run(
            () => updateHomeThoughtsDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <div className="px-3.5 py-3">
          <TextField
            hint={
              problems.label ??
              "Czytniki ekranu czytają go zamiast trudnych myśli."
            }
            id="cms-thoughts-label"
            invalid={Boolean(problems.label)}
            label="Nazwa pasa"
            maxLength={120}
            onChange={(label) => change({ ...draft, label })}
            value={draft.label}
          />
        </div>
        <p className="px-3.5 text-[0.75rem] text-[var(--text-muted)]">
          Każda trudna myśl zamienia się w swoją, gdy ktoś najedzie na nią
          kursorem lub ją dotknie. Od {HOME_THOUGHT_PAIRS_MIN} do{" "}
          {HOME_THOUGHT_PAIRS_MAX} par, trudne myśli krótkie (do 40 znaków).
        </p>
        <div className="px-3.5 pt-1.5">
          <Problem id="cms-thoughts-list-problem" text={problems.list} />
        </div>
        <ol
          aria-describedby={
            problems.list ? "cms-thoughts-list-problem" : undefined
          }
          aria-label="Pary myśli"
          className="grid gap-2.5 px-3.5 py-3"
        >
          {pairs.map((pair, index) => {
            const id = `cms-thoughts-${index}`;
            const name = pair.negative.trim() || `Para ${index + 1}`;
            return (
              <li
                className={cn(
                  "grid items-start gap-2.5 rounded-[5px] border border-[var(--border)] p-2.5",
                  "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
                )}
                key={index}
              >
                <PairField
                  id={`${id}-negative`}
                  label="Myśl trudna"
                  maxLength={40}
                  onChange={(negative) => changePair(index, { negative })}
                  problem={problems[`${index}.negative`]}
                  value={pair.negative}
                />
                <PairField
                  id={`${id}-positive`}
                  label="Zamienia się w"
                  maxLength={60}
                  onChange={(positive) => changePair(index, { positive })}
                  problem={problems[`${index}.positive`]}
                  value={pair.positive}
                />
                <div className="sm:pt-6">
                  <ListItemControls
                    canMoveDown={index < pairs.length - 1}
                    canMoveUp={index > 0}
                    canRemove={pairs.length > HOME_THOUGHT_PAIRS_MIN}
                    name={name}
                    onMove={(by) => setPairs(moveItem(pairs, index, by))}
                    onRemove={() =>
                      setPairs(removeItem(pairs, index, HOME_THOUGHT_PAIRS_MIN))
                    }
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={pairs.length >= HOME_THOUGHT_PAIRS_MAX}
            onClick={() =>
              setPairs(addItem(pairs, emptyThoughtPair, HOME_THOUGHT_PAIRS_MAX))
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj parę
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
