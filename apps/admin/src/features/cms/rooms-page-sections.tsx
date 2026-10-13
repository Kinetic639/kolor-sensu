"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import type { RoomsPageContent } from "@repo/contracts";
import { DetailSection } from "@repo/ui/detail-page";
import { useState } from "react";
import { updateRoomsPageDraftAction } from "./actions";
import type { RoomsPageViewModel } from "./types";

// Gabinety → the page's optional sections, switched on and off; the title
// and the rooms themselves always show.

export function RoomsPageSections({
  content,
}: {
  content: RoomsPageViewModel;
}) {
  const { isPending, run } = useSave();
  const initial: RoomsPageContent = {
    showAmenitiesSection: content.showAmenitiesSection,
    showLocationDetails: content.showLocationDetails,
  };
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty =
    draft.showAmenitiesSection !== saved.showAmenitiesSection ||
    draft.showLocationDetails !== saved.showLocationDetails;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => updateRoomsPageDraftAction(draft),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <DetailSection note="pod tytułem strony" title="Co u nas znajdziesz">
        <SwitchRow
          checked={draft.showAmenitiesSection}
          description="Lista zalet centrum pod nagłówkiem strony."
          label="Pokaż sekcję"
          onCheckedChange={(showAmenitiesSection) =>
            setDraft((current) => ({ ...current, showAmenitiesSection }))
          }
        />
      </DetailSection>
      <DetailSection
        note="nad gabinetami każdej siedziby"
        title="Opis siedziby"
      >
        <SwitchRow
          checked={draft.showLocationDetails}
          description="Nazwa, adres, opis i udogodnienia każdej lokalizacji nad jej gabinetami."
          label="Pokaż sekcję"
          onCheckedChange={(showLocationDetails) =>
            setDraft((current) => ({ ...current, showLocationDetails }))
          }
        />
        <div className="px-3.5 py-2.5">
          <SaveRow dirty={dirty} pending={isPending}>
            Zapisz szkic
          </SaveRow>
        </div>
      </DetailSection>
    </form>
  );
}
