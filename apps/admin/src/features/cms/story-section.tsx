"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  HOME_STORY_STEPS_MAX,
  homeStoryContentSchema,
  storyMediaOf,
} from "@repo/contracts";
import { StoryMediaFields, type StoryMediaOptions } from "./story-media-fields";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { updateHomeStoryDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { type StoryDraftStep, toStoryContent } from "./home-texts-editor";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import { SiteImageField } from "./site-image-field";
import { TextField } from "./text-field";
import type { ContentViewModel, HomeStoryStepRow } from "./types";

// Home → "Jak zacząć", the story told while scrolling: its header (the
// block above the form) and one to four steps, each a title, a text, an
// optional button to a page of the site and an optional photo (without
// one, the site's). Saved as a draft; the page bar publishes.

const emptyStep: StoryDraftStep = {
  heading: "",
  text: "",
  cta: { label: "", href: "" },
  imagePath: null,
  imageAlt: "",
  imageUrl: null,
};

export function StorySection({
  model,
  header,
}: {
  model: ContentViewModel<{ steps: HomeStoryStepRow[] }> & {
    mediaOptions?: StoryMediaOptions;
  };
  header?: ReactNode;
}) {
  const { isPending, run } = useSave();
  const initial: StoryDraftStep[] = model.content.steps.map((step) => ({
    ...step,
    media: storyMediaOf(step),
    cta:
      !step.media &&
      storyMediaOf(step).type === "articles" &&
      step.cta?.label === "Czytaj artykuły"
        ? { ...step.cta, label: "Więcej artykułów" }
        : (step.cta ?? { label: "", href: "" }),
  }));
  const [steps, setStepsState] = useState<StoryDraftStep[]>(initial);
  const [saved, setSaved] = useState<StoryDraftStep[]>(initial);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty =
    JSON.stringify(toStoryContent(steps)) !==
    JSON.stringify(toStoryContent(saved));
  const setSteps = (next: readonly StoryDraftStep[]) =>
    setStepsState([...next]);
  const setStep = (index: number, patch: Partial<StoryDraftStep>) =>
    setSteps(
      steps.map((one, at) => (at === index ? { ...one, ...patch } : one)),
    );
  const setCta = (
    index: number,
    patch: Partial<{ label: string; href: string }>,
  ) =>
    setStep(index, {
      cta: { label: "", href: "", ...steps[index]?.cta, ...patch },
    });

  return (
    <CmsSection note="slajdy zmieniające się przy przewijaniu" title="Edukacja">
      {header}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = homeStoryContentSchema.safeParse(
            toStoryContent(steps),
          );
          if (!result.success) {
            setProblems(
              Object.fromEntries(
                result.error.issues.map((issue) => [
                  issue.path.join("."),
                  true,
                ]),
              ),
            );
            toast.error("Uzupełnij zaznaczone pola");
            return;
          }
          setProblems({});
          run(
            () => updateHomeStoryDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(steps),
          );
        }}
      >
        <ol className="grid gap-3.5 px-3.5 py-3">
          {steps.map((step, index) => {
            const at = `steps.${index}`;
            return (
              <li key={index}>
                <fieldset className="grid gap-2.5 rounded-[5px] border border-[var(--border)] p-2.5 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-2 sm:col-span-2">
                    <legend className="px-1 text-[0.75rem] font-semibold text-[var(--text-muted)]">
                      Slajd {index + 1}
                    </legend>
                    <ListItemControls
                      canMoveDown={index < steps.length - 1}
                      canMoveUp={index > 0}
                      canRemove={steps.length > 1}
                      name={step.heading || `Krok ${index + 1}`}
                      onMove={(by) => setSteps(moveItem(steps, index, by))}
                      onRemove={() => setSteps(removeItem(steps, index, 1))}
                    />
                  </div>
                  <TextField
                    className="sm:col-span-2"
                    id={`cms-story-${index}-heading`}
                    invalid={problems[`${at}.heading`]}
                    label="Tytuł"
                    maxLength={80}
                    onChange={(heading) => setStep(index, { heading })}
                    value={step.heading}
                  />
                  <StoryMediaFields
                    id={`cms-story-${index}-media`}
                    value={storyMediaOf(step)}
                    options={
                      model.mediaOptions ?? {
                        articles: [],
                        ebooks: [],
                        workshops: [],
                      }
                    }
                    onChange={(media) => setStep(index, { media })}
                    invalid={Object.keys(problems).some((path) =>
                      path.startsWith(`${at}.media`),
                    )}
                  />
                  <TextField
                    className="sm:col-span-2"
                    id={`cms-story-${index}-text`}
                    invalid={problems[`${at}.text`]}
                    label="Tekst"
                    maxLength={400}
                    multiline
                    onChange={(text) => setStep(index, { text })}
                    rows={3}
                    value={step.text}
                  />
                  <TextField
                    hint="Puste oba pola: krok bez przycisku."
                    id={`cms-story-${index}-cta`}
                    invalid={problems[`${at}.cta.label`]}
                    label="Tekst przycisku"
                    maxLength={40}
                    onChange={(label) => setCta(index, { label })}
                    value={step.cta?.label ?? ""}
                  />
                  <TextField
                    hint="Adres na stronie, np. /gabinety albo /umow-wizyte."
                    id={`cms-story-${index}-href`}
                    invalid={problems[`${at}.cta.href`]}
                    label="Dokąd prowadzi"
                    maxLength={200}
                    onChange={(href) => setCta(index, { href })}
                    value={step.cta?.href ?? ""}
                  />
                  <SiteImageField
                    folder="story"
                    hint="Bez niego: jedno ze zdjęć strony."
                    id={`cms-story-${index}-image`}
                    label={
                      storyMediaOf(step).type === "image"
                        ? "Zdjęcie"
                        : "Zdjęcie zastępcze"
                    }
                    onChange={(patch) => setStep(index, patch)}
                    value={step}
                  />
                </fieldset>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={steps.length >= HOME_STORY_STEPS_MAX}
            onClick={() =>
              setSteps(addItem(steps, emptyStep, HOME_STORY_STEPS_MAX))
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj slajd
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
