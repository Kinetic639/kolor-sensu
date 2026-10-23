"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import { roomsPageContentSchema, type RoomsPageContent } from "@repo/contracts";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateRoomsPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { linesToList, listToLines } from "./lines";
import { IntroFields, problemsOf } from "./intro-fields";
import { TextField } from "./text-field";
import type { RoomsPageViewModel } from "./types";

// Gabinety → the page's top, "Co u nas znajdziesz" (its switch, heading and
// points, one per line) and the location details' switch, and the line
// shown while no room is published. One draft, saved from any section.

type Draft = Omit<RoomsPageContent, "amenities"> & { amenities: string };

const toDraft = (content: RoomsPageViewModel): Draft => ({
  showAmenitiesSection: content.showAmenitiesSection,
  showLocationDetails: content.showLocationDetails,
  intro: content.intro,
  amenitiesHeading: content.amenitiesHeading,
  amenities: listToLines(content.amenities),
  emptyText: content.emptyText,
});

const toContent = ({ amenities, ...draft }: Draft): RoomsPageContent => ({
  ...draft,
  amenities: linesToList(amenities),
});

export function RoomsPageSections({
  content,
}: {
  content: RoomsPageViewModel;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(() => toDraft(content));
  const [saved, setSaved] = useState(() => toDraft(content));
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty =
    JSON.stringify(toContent(draft)) !== JSON.stringify(toContent(saved));
  const change = (patch: Partial<Draft>) =>
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
        const result = roomsPageContentSchema.safeParse(toContent(draft));
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateRoomsPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id="cms-rooms-intro"
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="pod tytułem strony" title="Co u nas znajdziesz">
        <SwitchRow
          checked={draft.showAmenitiesSection}
          description="Lista zalet centrum pod nagłówkiem strony."
          label="Pokaż sekcję"
          onCheckedChange={(showAmenitiesSection) =>
            change({ showAmenitiesSection })
          }
        />
        <div className="grid gap-3.5 px-3.5 py-3">
          <TextField
            id="cms-rooms-amenities-heading"
            invalid={problems.amenitiesHeading}
            label="Nagłówek"
            maxLength={80}
            onChange={(amenitiesHeading) => change({ amenitiesHeading })}
            value={draft.amenitiesHeading}
          />
          <TextField
            hint={`Jeden w linijce, do 8 (do 120 znaków). Teraz: ${linesToList(draft.amenities).length}.`}
            id="cms-rooms-amenities"
            invalid={problems.amenities}
            label="Punkty"
            maxLength={1200}
            multiline
            onChange={(amenities) => change({ amenities })}
            rows={5}
            value={draft.amenities}
          />
        </div>
        {saveRow}
      </CmsSection>
      <CmsSection note="nad gabinetami każdej siedziby" title="Opis siedziby">
        <SwitchRow
          checked={draft.showLocationDetails}
          description="Nazwa, adres, opis i udogodnienia każdej lokalizacji nad jej gabinetami."
          label="Pokaż sekcję"
          onCheckedChange={(showLocationDetails) =>
            change({ showLocationDetails })
          }
        />
        {saveRow}
      </CmsSection>
      <CmsSection note="gdy nie ma jeszcze gabinetów" title="Brak gabinetów">
        <div className="px-3.5 py-3">
          <TextField
            id="cms-rooms-empty"
            invalid={problems.emptyText}
            label="Tekst"
            maxLength={300}
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
