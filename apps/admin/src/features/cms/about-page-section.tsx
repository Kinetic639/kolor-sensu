"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  ABOUT_AUDIENCES_MAX,
  aboutPageContentSchema,
  type AboutAudience,
  type AboutPageContent,
} from "@repo/contracts";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { updateAboutPageDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { linesToList, listToLines } from "./lines";
import { IntroFields, problemsOf } from "./intro-fields";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import { SiteImageField } from "./site-image-field";
import { TextField } from "./text-field";
import type { ContentViewModel } from "./types";

// O nas → its words: the top, "Nasza historia" (a switch, its text and
// photo), the three value cards with the concrete facts under the last
// (a switch and one fact per line), and "Z kim pracujemy" (a switch, its
// cards and a line under them). One draft, saved from any section; the
// sections' headers are their own blocks (HeaderBlock), passed in.

type Draft = Omit<AboutPageContent, "professionalism"> & {
  professionalism: string;
  storyImageUrl: string | null;
};

const toContent = ({
  professionalism,
  storyImageUrl: _preview,
  ...draft
}: Draft): AboutPageContent => ({
  ...draft,
  professionalism: linesToList(professionalism),
});

const emptyAudience: AboutAudience = { title: "", text: "", href: "/oferta" };

export function AboutPageSection({
  model,
  storyHeader,
  audiencesHeader,
}: {
  model: ContentViewModel<AboutPageContent> & { storyImageUrl: string | null };
  storyHeader?: ReactNode;
  audiencesHeader?: ReactNode;
}) {
  const { isPending, run } = useSave();
  const initial: Draft = {
    ...model.content,
    professionalism: listToLines(model.content.professionalism),
    storyImageUrl: model.storyImageUrl,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty =
    JSON.stringify(toContent(draft)) !== JSON.stringify(toContent(saved));
  const change = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const audiences = draft.audiences;
  const setAudiences = (next: readonly AboutAudience[]) =>
    change({ audiences: [...next] });
  const setAudience = (index: number, patch: Partial<AboutAudience>) =>
    setAudiences(
      audiences.map((one, at) => (at === index ? { ...one, ...patch } : one)),
    );
  const setValue = (index: number, patch: Partial<Draft["values"][number]>) =>
    change({
      values: draft.values.map((one, at) =>
        at === index ? { ...one, ...patch } : one,
      ),
    });
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
        const result = aboutPageContentSchema.safeParse(toContent(draft));
        if (!result.success) {
          setProblems(problemsOf(result.error.issues));
          toast.error("Uzupełnij zaznaczone pola");
          return;
        }
        setProblems({});
        run(
          () => updateAboutPageDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection note="nagłówek strony" title="Tytuł strony">
        <IntroFields
          id="cms-about-intro"
          leadHint="Puste: krótki opis centrum z Ustawień, a bez niego tekst strony."
          onChange={(intro) => change({ intro })}
          problems={problems}
          value={draft.intro}
        />
        {saveRow}
      </CmsSection>

      <CmsSection note="kim jesteśmy, skąd nazwa" title="Nasza historia">
        {storyHeader}
        <SwitchRow
          checked={draft.showStory}
          description="Kilka zdań o centrum ze zdjęciem. Włącz, gdy treść jest gotowa; pusta historia się nie pokazuje."
          label="Pokaż sekcję"
          onCheckedChange={(showStory) => change({ showStory })}
        />
        <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            hint="Pusta linijka zaczyna nowy akapit."
            id="cms-about-story"
            label="Tekst"
            maxLength={2000}
            multiline
            onChange={(text) => change({ story: { ...draft.story, text } })}
            rows={6}
            value={draft.story.text}
          />
          <SiteImageField
            folder="about"
            hint="Zdjęcie zespołu albo miejsca, poziome. Opcjonalne."
            id="cms-about-story-image"
            label="Zdjęcie"
            onChange={(patch) =>
              change({
                story: {
                  ...draft.story,
                  ...(patch.imagePath !== undefined && {
                    imagePath: patch.imagePath,
                  }),
                  ...(patch.imageAlt !== undefined && {
                    imageAlt: patch.imageAlt,
                  }),
                },
                ...(patch.imageUrl !== undefined && {
                  storyImageUrl: patch.imageUrl,
                }),
              })
            }
            value={{
              imagePath: draft.story.imagePath,
              imageAlt: draft.story.imageAlt,
              imageUrl: draft.storyImageUrl,
            }}
          />
        </div>
        {saveRow}
      </CmsSection>

      <CmsSection note="trzy karty" title="Wartości">
        <ol className="grid gap-3.5 px-3.5 py-3">
          {draft.values.map((value, index) => (
            <li key={index}>
              <fieldset className="grid gap-2.5 rounded-[5px] border border-[var(--border)] p-2.5">
                <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                  Karta {index + 1}
                </legend>
                <TextField
                  id={`cms-about-value-${index}-title`}
                  invalid={problems[`values.${index}.title`]}
                  label="Tytuł"
                  maxLength={60}
                  onChange={(title) => setValue(index, { title })}
                  value={value.title}
                />
                <TextField
                  id={`cms-about-value-${index}-text`}
                  invalid={problems[`values.${index}.text`]}
                  label="Opis"
                  maxLength={240}
                  multiline
                  onChange={(text) => setValue(index, { text })}
                  value={value.text}
                />
              </fieldset>
            </li>
          ))}
        </ol>
        <SwitchRow
          checked={draft.showProfessionalism}
          description="Konkrety pod ostatnią kartą (Profesjonalizm): superwizja, kodeks etyczny, towarzystwa."
          label="Pokaż konkrety"
          onCheckedChange={(showProfessionalism) =>
            change({ showProfessionalism })
          }
        />
        <div className="px-3.5 py-3">
          <TextField
            hint={`Jeden w linijce, do 8 (do 120 znaków). Teraz: ${linesToList(draft.professionalism).length}.`}
            id="cms-about-professionalism"
            invalid={problems.professionalism}
            label="Konkrety"
            maxLength={1200}
            multiline
            onChange={(professionalism) => change({ professionalism })}
            rows={4}
            value={draft.professionalism}
          />
        </div>
        {saveRow}
      </CmsSection>

      <CmsSection note="karty prowadzące do Oferty" title="Z kim pracujemy">
        {audiencesHeader}
        <SwitchRow
          checked={draft.showAudiences}
          description="Karty: dorośli, pary, dzieci i młodzież, każda z linkiem do Oferty."
          label="Pokaż sekcję"
          onCheckedChange={(showAudiences) => change({ showAudiences })}
        />
        <ol className="grid gap-3.5 px-3.5 py-3">
          {audiences.map((audience, index) => (
            <li key={index}>
              <fieldset className="grid gap-2.5 rounded-[5px] border border-[var(--border)] p-2.5 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-2 sm:col-span-2">
                  <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                    Karta {index + 1}
                  </legend>
                  <ListItemControls
                    canMoveDown={index < audiences.length - 1}
                    canMoveUp={index > 0}
                    canRemove={audiences.length > 1}
                    name={audience.title || `Karta ${index + 1}`}
                    onMove={(by) =>
                      setAudiences(moveItem(audiences, index, by))
                    }
                    onRemove={() =>
                      setAudiences(removeItem(audiences, index, 1))
                    }
                  />
                </div>
                <TextField
                  id={`cms-about-audience-${index}-title`}
                  invalid={problems[`audiences.${index}.title`]}
                  label="Tytuł"
                  maxLength={60}
                  onChange={(title) => setAudience(index, { title })}
                  value={audience.title}
                />
                <TextField
                  hint="Adres na stronie, np. /oferta."
                  id={`cms-about-audience-${index}-href`}
                  invalid={problems[`audiences.${index}.href`]}
                  label="Dokąd prowadzi"
                  maxLength={200}
                  onChange={(href) => setAudience(index, { href })}
                  value={audience.href}
                />
                <TextField
                  className="sm:col-span-2"
                  id={`cms-about-audience-${index}-text`}
                  label="Opis"
                  maxLength={200}
                  onChange={(text) => setAudience(index, { text })}
                  value={audience.text}
                />
              </fieldset>
            </li>
          ))}
        </ol>
        <div className="grid gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={audiences.length >= ABOUT_AUDIENCES_MAX}
            onClick={() =>
              setAudiences(
                addItem(audiences, emptyAudience, ABOUT_AUDIENCES_MAX),
              )
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj kartę
          </button>
          <TextField
            hint="Jedna linijka pod kartami, np. gdzie i jak odbywają się spotkania."
            id="cms-about-audiences-note"
            label="Dopisek"
            maxLength={160}
            onChange={(audiencesNote) => change({ audiencesNote })}
            value={draft.audiencesNote}
          />
        </div>
        {saveRow}
      </CmsSection>
    </form>
  );
}
