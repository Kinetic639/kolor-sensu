"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  closingCtaContentSchema,
  siteContactContentSchema,
  type ClosingCtaContent,
  type SiteContactContent,
} from "@repo/contracts";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import {
  updateClosingCtaDraftAction,
  updateSiteContactDraftAction,
} from "./actions";
import { CmsSection } from "./cms-section";
import { problemsOf } from "./intro-fields";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// Ustawienia wspólne → words several pages share: the closing banner
// ("Zrób pierwszy krok…" and its two buttons) and the contact hours (the
// footer, Kontakt, "Gdzie jesteśmy").

export function ClosingCtaSection({
  model,
}: {
  model: ContentViewModel<ClosingCtaContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<ClosingCtaContent>) =>
    setDraft((current) => ({ ...current, ...patch }));

  return (
    <CmsSection note="na końcu wielu stron" title="Baner „Zrób pierwszy krok”">
      <form
        className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = closingCtaContentSchema.safeParse(draft);
          if (!result.success) {
            setProblems(problemsOf(result.error.issues));
            toast.error("Uzupełnij zaznaczone pola");
            return;
          }
          setProblems({});
          run(
            () => updateClosingCtaDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <TextField
          className="sm:col-span-2"
          hint="Specjaliści mają własny nagłówek (CMS → Specjaliści)."
          id="cms-closing-heading"
          invalid={problems.heading}
          label="Nagłówek"
          maxLength={120}
          onChange={(heading) => change({ heading })}
          value={draft.heading}
        />
        <TextField
          hint="Prowadzi do umawiania wizyty."
          id="cms-closing-booking"
          invalid={problems.bookingLabel}
          label="Główny przycisk"
          maxLength={40}
          onChange={(bookingLabel) => change({ bookingLabel })}
          value={draft.bookingLabel}
        />
        <TextField
          hint="Prowadzi na stronę Kontakt."
          id="cms-closing-contact"
          invalid={problems.contactLabel}
          label="Drugi przycisk"
          maxLength={40}
          onChange={(contactLabel) => change({ contactLabel })}
          value={draft.contactLabel}
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

export function SiteContactSection({
  model,
}: {
  model: ContentViewModel<SiteContactContent>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(model.content);
  const [saved, setSaved] = useState(model.content);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <CmsSection note="stopka, Kontakt, Gdzie jesteśmy" title="Godziny kontaktu">
      <form
        className="grid gap-3.5 px-3.5 py-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = siteContactContentSchema.safeParse(draft);
          if (!result.success) {
            toast.error("Popraw godziny");
            return;
          }
          run(
            () => updateSiteContactDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <TextField
          hint="Np. „Pn–Pt 8:00–20:00, sob. 9:00–14:00”. Puste: bez godzin. Adres, telefon i e-mail są w Ustawieniach."
          id="cms-site-hours"
          label="Godziny"
          maxLength={160}
          onChange={(hours) => setDraft({ hours })}
          value={draft.hours}
        />
        <SaveRow dirty={dirty} pending={isPending}>
          Zapisz szkic
        </SaveRow>
      </form>
    </CmsSection>
  );
}
