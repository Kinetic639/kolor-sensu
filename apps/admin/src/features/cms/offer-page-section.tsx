"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  offerPageContentSchema,
  servicePageContentSchema,
  type OfferPageContent,
  type ServicePageContent,
} from "@repo/contracts";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import {
  updateOfferPageDraftAction,
  updateServicePageDraftAction,
} from "./actions";
import { CmsSection } from "./cms-section";
import { IntroFields, problemsOf } from "./intro-fields";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Oferta → its words: the top and the line while no service is published.
// The tiles and catalogues are the services' (Usługi, in the portal).

export function OfferPageSection({
  model,
}: {
  model: ContentViewModel<OfferPageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<OfferPageContent>) =>
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
        const result = offerPageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateOfferPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id="cms-offer-intro"
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="gdy nie ma jeszcze żadnej usługi" title="Pusta oferta">
        <div className="px-3.5 py-3">
          <TextField
            id="cms-offer-empty"
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
    </form>
  );
}

// Every service's page → the words they share: "Jak pracujemy", and what a
// service not booked online shows instead of "Umów" and its price. The
// service's name, description, duration and prices are the portal's.

export function ServicePageSection({
  model,
}: {
  model: ContentViewModel<ServicePageContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const how = (patch: Partial<ServicePageContent["howWeWork"]>) =>
    setDraft((current) => ({
      ...current,
      howWeWork: { ...current.howWeWork, ...patch },
    }));
  const unbooked = (patch: Partial<ServicePageContent["unbooked"]>) =>
    setDraft((current) => ({
      ...current,
      unbooked: { ...current.unbooked, ...patch },
    }));
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
        const result = servicePageContentSchema.safeParse(draft);
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateServicePageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection
        note="strona każdej usługi, pod opisem"
        title="Strona usługi: Jak pracujemy"
      >
        <div className="grid gap-3 px-3.5 py-3">
          <TextField
            id="cms-service-how-eyebrow"
            label="Nadtytuł"
            maxLength={80}
            onChange={(eyebrow) => how({ eyebrow })}
            value={draft.howWeWork.eyebrow}
          />
          <TextField
            id="cms-service-how-heading"
            invalid={problems["howWeWork.heading"]}
            label="Tytuł"
            maxLength={120}
            onChange={(heading) => how({ heading })}
            value={draft.howWeWork.heading}
          />
          <TextField
            id="cms-service-how-description"
            label="Opis"
            maxLength={600}
            multiline
            onChange={(description) => how({ description })}
            rows={3}
            value={draft.howWeWork.description}
          />
          <TextField
            hint="Prowadzi do pierwszej konsultacji."
            id="cms-service-how-cta"
            invalid={problems["howWeWork.ctaLabel"]}
            label="Przycisk"
            maxLength={40}
            onChange={(ctaLabel) => how({ ctaLabel })}
            value={draft.howWeWork.ctaLabel}
          />
        </div>
        {saveRow}
      </CmsSection>
      <CmsSection
        note="gdy nikt jej nie prowadzi albo rezerwacja online jest wyłączona"
        title="Strona usługi: bez rezerwacji online"
      >
        <div className="grid gap-3 px-3.5 py-3">
          <TextField
            hint="Zamiast ceny."
            id="cms-service-unbooked-price"
            invalid={problems["unbooked.priceText"]}
            label="Cena"
            maxLength={160}
            onChange={(priceText) => unbooked({ priceText })}
            value={draft.unbooked.priceText}
          />
          <TextField
            hint="Zamiast „Umów wizytę”; prowadzi na Kontakt."
            id="cms-service-unbooked-contact"
            invalid={problems["unbooked.contactLabel"]}
            label="Przycisk"
            maxLength={40}
            onChange={(contactLabel) => unbooked({ contactLabel })}
            value={draft.unbooked.contactLabel}
          />
        </div>
        {saveRow}
      </CmsSection>
    </form>
  );
}
