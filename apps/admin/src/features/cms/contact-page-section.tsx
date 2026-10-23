"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  CONTACT_FAQ_MAX,
  contactPageContentSchema,
  type ContactFaqItem,
  type ContactPageContent,
} from "@repo/contracts";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { useState } from "react";
import { updateContactPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Kontakt → its words: the top, how to get here, the form's heading, and
// the questions and answers. The address, phone, e-mail and map come from
// Ustawienia (the company), the hours from Ustawienia wspólne.

export function ContactPageSection({
  model,
}: {
  model: ContentViewModel<ContactPageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<ContactPageContent>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const faq = draft.faq;
  const setFaq = (next: readonly ContactFaqItem[]) =>
    change({ faq: [...next] });
  const setItem = (index: number, patch: Partial<ContactFaqItem>) =>
    setFaq(faq.map((one, at) => (at === index ? { ...one, ...patch } : one)));
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
        const result = contactPageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateContactPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id="cms-contact-intro"
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="przy danych kontaktowych i mapie" title="Dojazd">
        <div className="px-3.5 py-3">
          <TextField
            hint="Komunikacja, parking, wejście. Puste: bez tej części."
            id="cms-contact-travel"
            label="Jak do nas trafić"
            maxLength={1000}
            multiline
            onChange={(travel) => change({ travel })}
            rows={4}
            value={draft.travel}
          />
        </div>
        {saveRow}
      </CmsSection>
      <CmsSection note="wiadomość do centrum" title="Formularz">
        <div className="px-3.5 py-3">
          <TextField
            hint="Wiadomości przychodzą na e-mail centrum z Ustawień."
            id="cms-contact-form-heading"
            invalid={problems.formHeading}
            label="Nagłówek formularza"
            maxLength={120}
            onChange={(formHeading) => change({ formHeading })}
            value={draft.formHeading}
          />
        </div>
        {saveRow}
      </CmsSection>
      <CmsSection note="pytania i odpowiedzi" title="FAQ">
        <div className="px-3.5 py-3">
          <TextField
            hint="Pytanie o odwołanie i przełożenie wizyty strona dodaje sama, z godzinami z Ustawień → Rezerwacje online."
            id="cms-contact-faq-heading"
            invalid={problems.faqHeading}
            label="Nagłówek"
            maxLength={120}
            onChange={(faqHeading) => change({ faqHeading })}
            value={draft.faqHeading}
          />
        </div>
        <ol className="grid gap-3.5 px-3.5 py-3">
          {faq.map((item, index) => (
            <li key={index}>
              <fieldset className="grid gap-2.5 rounded-[5px] border border-[var(--border)] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                    Pytanie {index + 1}
                  </legend>
                  <ListItemControls
                    canMoveDown={index < faq.length - 1}
                    canMoveUp={index > 0}
                    canRemove
                    name={item.question || `Pytanie ${index + 1}`}
                    onMove={(by) => setFaq(moveItem(faq, index, by))}
                    onRemove={() => setFaq(removeItem(faq, index, 0))}
                  />
                </div>
                <TextField
                  id={`cms-contact-faq-${index}-question`}
                  invalid={problems[`faq.${index}.question`]}
                  label="Pytanie"
                  maxLength={160}
                  onChange={(question) => setItem(index, { question })}
                  value={item.question}
                />
                <TextField
                  id={`cms-contact-faq-${index}-answer`}
                  invalid={problems[`faq.${index}.answer`]}
                  label="Odpowiedź"
                  maxLength={1200}
                  multiline
                  onChange={(answer) => setItem(index, { answer })}
                  rows={3}
                  value={item.answer}
                />
              </fieldset>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={faq.length >= CONTACT_FAQ_MAX}
            onClick={() =>
              setFaq(
                addItem(faq, { question: "", answer: "" }, CONTACT_FAQ_MAX),
              )
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj pytanie
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
