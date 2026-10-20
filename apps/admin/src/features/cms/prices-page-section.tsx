"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  PRICE_RULES_MAX,
  pricesPageContentSchema,
  type PriceRule,
  type PricesPageContent,
} from "@repo/contracts";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { useState } from "react";
import { updatePricesPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Cennik → its words: the top, the lines for no services and for a service
// without a price, and the rules of payment and cancelling. The prices are
// the specialists' offers; how long before a visit it is cancelled free is
// in Ustawienia (Rezerwacje online) and shows first among the rules.

export function PricesPageSection({
  model,
}: {
  model: ContentViewModel<PricesPageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<PricesPageContent>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const rules = draft.rules;
  const setRules = (next: readonly PriceRule[]) => change({ rules: [...next] });
  const setRule = (index: number, patch: Partial<PriceRule>) =>
    setRules(
      rules.map((one, at) => (at === index ? { ...one, ...patch } : one)),
    );
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
        const result = pricesPageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updatePricesPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id="cms-prices-intro"
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="ceny są z ofert specjalistów" title="Ceny">
        <div className="grid gap-3 px-3.5 py-3">
          <TextField
            hint="Na karcie usługi, której nikt nie wycenił."
            id="cms-prices-no-price"
            invalid={problems.noPriceText}
            label="Usługa bez ceny"
            maxLength={200}
            onChange={(noPriceText) => change({ noPriceText })}
            value={draft.noPriceText}
          />
          <TextField
            hint="Gdy nie ma jeszcze żadnej usługi."
            id="cms-prices-empty"
            invalid={problems.emptyText}
            label="Pusty cennik"
            maxLength={400}
            multiline
            onChange={(emptyText) => change({ emptyText })}
            value={draft.emptyText}
          />
        </div>
        {saveRow}
      </CmsSection>
      <CmsSection
        note="czas na bezpłatne odwołanie jest z Ustawień (Rezerwacje online)"
        title="Płatności i odwołania"
      >
        <div className="px-3.5 py-3">
          <TextField
            id="cms-prices-rules-heading"
            invalid={problems.rulesHeading}
            label="Nagłówek"
            maxLength={120}
            onChange={(rulesHeading) => change({ rulesHeading })}
            value={draft.rulesHeading}
          />
        </div>
        <ol className="grid gap-3.5 px-3.5 py-3">
          {rules.map((rule, index) => (
            <li key={index}>
              <fieldset className="grid gap-2.5 rounded-[5px] border border-[var(--border)] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                    Zasada {index + 1}
                  </legend>
                  <ListItemControls
                    canMoveDown={index < rules.length - 1}
                    canMoveUp={index > 0}
                    canRemove
                    name={rule.title || `Zasada ${index + 1}`}
                    onMove={(by) => setRules(moveItem(rules, index, by))}
                    onRemove={() => setRules(removeItem(rules, index, 0))}
                  />
                </div>
                <TextField
                  id={`cms-prices-rule-${index}-title`}
                  invalid={problems[`rules.${index}.title`]}
                  label="Tytuł"
                  maxLength={80}
                  onChange={(title) => setRule(index, { title })}
                  value={rule.title}
                />
                <TextField
                  id={`cms-prices-rule-${index}-text`}
                  invalid={problems[`rules.${index}.text`]}
                  label="Treść"
                  maxLength={600}
                  multiline
                  onChange={(text) => setRule(index, { text })}
                  rows={3}
                  value={rule.text}
                />
              </fieldset>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={rules.length >= PRICE_RULES_MAX}
            onClick={() =>
              setRules(addItem(rules, { title: "", text: "" }, PRICE_RULES_MAX))
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj zasadę
          </button>
          <div className="flex-1">
            <SaveRow dirty={dirty} pending={isPending}>
              Zapisz szkic
            </SaveRow>
          </div>
        </div>
      </CmsSection>
    </form>
  );
}
