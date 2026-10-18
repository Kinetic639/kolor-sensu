"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { type ActionResult, useSave } from "@/lib/use-save";
import type {
  HomeLocationContent,
  NewsletterBandContent,
} from "@repo/contracts";
import { type ReactNode, useState } from "react";
import {
  updateHomeLocationDraftAction,
  updateNewsletterBandDraftAction,
} from "./actions";
import { CmsSection } from "./cms-section";
import type { ContentViewModel } from "./types";

// Home → the sections whose words are their header and whose only setting
// is whether they show: the newsletter band and "Gdzie jesteśmy". Saved as
// a draft; the page bar publishes.

function VisibilityForm({
  visible,
  label,
  description,
  save,
}: {
  visible: boolean;
  label: string;
  description: string;
  save: (content: { visible: boolean }) => Promise<ActionResult>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(visible);
  const [saved, setSaved] = useState(visible);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => save({ visible: draft }),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <SwitchRow
        checked={draft}
        description={description}
        label={label}
        onCheckedChange={setDraft}
      />
      <div className="px-3.5 py-2.5">
        <SaveRow dirty={draft !== saved} pending={isPending}>
          Zapisz szkic
        </SaveRow>
      </div>
    </form>
  );
}

export function NewsletterBandSection({
  model,
  header,
}: {
  model: ContentViewModel<NewsletterBandContent>;
  header?: ReactNode;
}) {
  return (
    <CmsSection
      note="pas z zaproszeniem do newslettera; formularz zapisu dojdzie po wyborze narzędzia"
      title="Newsletter"
    >
      {header}
      <VisibilityForm
        description="Pas pod historią „Jak zacząć”. Na razie bez formularza zapisu: pokazuje nagłówek i ewentualny przycisk."
        label="Pokaż sekcję"
        save={updateNewsletterBandDraftAction}
        visible={model.content.visible}
      />
    </CmsSection>
  );
}

export function HomeLocationSection({
  model,
  header,
}: {
  model: ContentViewModel<HomeLocationContent>;
  header?: ReactNode;
}) {
  return (
    <CmsSection
      note="adres, telefon, e-mail i godziny z ustawień firmy, z linkiem do mapy"
      title="Gdzie jesteśmy"
    >
      {header}
      <VisibilityForm
        description="Sekcja przed zaproszeniem na końcu strony. Adres, telefon i e-mail zmieniasz w ustawieniach firmy i lokalizacji."
        label="Pokaż sekcję"
        save={updateHomeLocationDraftAction}
        visible={model.content.visible}
      />
    </CmsSection>
  );
}
