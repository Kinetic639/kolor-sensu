"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  HERO_POINT_ICONS,
  HERO_POINTS_MAX,
  homePageContentSchema,
  type HeroPoint,
  type HomePageContent,
} from "@repo/contracts";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import { Plus } from "lucide-react";
import { useState } from "react";
import { updateHomeDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import { addItem, moveItem, removeItem } from "./list-editor";
import { ListItemControls } from "./list-item-controls";
import { SiteImageField } from "./site-image-field";
import { TextField } from "./text-field";
import type { HomeContentViewModel } from "./types";

// Home → Hero, the first screen: its words (eyebrow, title and its green
// second line, description, the two buttons' labels), up to four points
// with an icon each, and its photo. Saved as a draft; the page bar
// publishes. The buttons' addresses stay the site's (booking, O nas).

const iconLabels: Record<HeroPoint["icon"], string> = {
  leaf: "Liść",
  users: "Ludzie",
  house: "Dom",
  heart: "Serce (różowe)",
  shield: "Tarcza",
  sparkles: "Iskry",
};

type Draft = HomePageContent & { imageUrl: string | null };

function toContent({ imageUrl: _preview, ...content }: Draft): HomePageContent {
  return {
    ...content,
    buttonLabel: content.buttonLabel || null,
    secondaryLabel: content.secondaryLabel || null,
  };
}

export function HeroSection({ content }: { content: HomeContentViewModel }) {
  const { isPending, run } = useSave();
  const initial: Draft = {
    eyebrow: content.eyebrow,
    heading: content.heading,
    accent: content.accent,
    body: content.body,
    buttonLabel: content.buttonLabel,
    secondaryLabel: content.secondaryLabel,
    points: content.points,
    imagePath: content.imagePath,
    imageAlt: content.imageAlt,
    imageUrl: content.imageUrl,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [problems, setProblems] = useState<Record<string, true>>({});
  const dirty =
    JSON.stringify(toContent(draft)) !== JSON.stringify(toContent(saved));
  const change = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const points = draft.points;
  const setPoints = (next: readonly HeroPoint[]) =>
    change({ points: [...next] });
  const setPoint = (index: number, patch: Partial<HeroPoint>) =>
    setPoints(
      points.map((one, at) => (at === index ? { ...one, ...patch } : one)),
    );

  return (
    <CmsSection note="pierwszy ekran" title="Hero">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = homePageContentSchema.safeParse(toContent(draft));
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
            () => updateHomeDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            hint="Mały napis nad tytułem. Puste: bez napisu."
            id="cms-hero-eyebrow"
            label="Nadtytuł"
            maxLength={80}
            onChange={(eyebrow) => change({ eyebrow })}
            value={draft.eyebrow}
          />
          <TextField
            id="cms-hero-heading"
            invalid={problems.heading}
            label="Tytuł"
            maxLength={200}
            onChange={(heading) => change({ heading })}
            value={draft.heading}
          />
          <TextField
            hint="Druga linia tytułu, na zielono. Puste: bez niej."
            id="cms-hero-accent"
            label="Akcent"
            maxLength={80}
            onChange={(accent) => change({ accent })}
            value={draft.accent}
          />
          <TextField
            className="sm:col-span-2"
            id="cms-hero-body"
            invalid={problems.body}
            label="Opis"
            maxLength={2000}
            multiline
            onChange={(body) => change({ body })}
            rows={3}
            value={draft.body}
          />
          <TextField
            hint="Prowadzi do umawiania wizyty. Puste: „Umów wizytę”."
            id="cms-hero-button"
            label="Tekst głównego przycisku"
            maxLength={100}
            onChange={(buttonLabel) => change({ buttonLabel })}
            value={draft.buttonLabel ?? ""}
          />
          <TextField
            hint="Prowadzi na stronę O nas. Puste: „Poznaj nas”."
            id="cms-hero-secondary"
            label="Tekst drugiego przycisku"
            maxLength={40}
            onChange={(secondaryLabel) => change({ secondaryLabel })}
            value={draft.secondaryLabel ?? ""}
          />
          <SiteImageField
            folder="hero"
            hint="Zdjęcie gabinetu albo wnętrza, poziome (3:2). Bez niego: zdjęcie strony."
            id="cms-hero-image"
            label="Zdjęcie"
            onChange={change}
            value={draft}
          />
        </div>
        <fieldset className="grid gap-2 px-3.5 py-3">
          <legend className="px-0 pb-1 text-[0.8125rem] font-semibold">
            Atuty pod opisem (do {HERO_POINTS_MAX})
          </legend>
          <ol className="grid gap-2">
            {points.map((point, index) => (
              <li
                className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
                key={index}
              >
                <TextField
                  id={`cms-hero-point-${index}`}
                  invalid={problems[`points.${index}.label`]}
                  label={`Atut ${index + 1}`}
                  maxLength={40}
                  onChange={(label) => setPoint(index, { label })}
                  value={point.label}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor={`cms-hero-point-${index}-icon`}>Ikonka</Label>
                  <Select
                    onValueChange={(icon) =>
                      setPoint(index, { icon: icon as HeroPoint["icon"] })
                    }
                    value={point.icon}
                  >
                    <SelectTrigger id={`cms-hero-point-${index}-icon`}>
                      <SelectValue>{iconLabels[point.icon]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {HERO_POINT_ICONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {iconLabels[icon]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ListItemControls
                  canMoveDown={index < points.length - 1}
                  canMoveUp={index > 0}
                  canRemove
                  name={point.label || `Atut ${index + 1}`}
                  onMove={(by) => setPoints(moveItem(points, index, by))}
                  onRemove={() => setPoints(removeItem(points, index, 0))}
                />
              </li>
            ))}
          </ol>
        </fieldset>
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <button
            className={DETAIL_BUTTON}
            disabled={points.length >= HERO_POINTS_MAX}
            onClick={() =>
              setPoints(
                addItem(points, { label: "", icon: "leaf" }, HERO_POINTS_MAX),
              )
            }
            type="button"
          >
            <Plus aria-hidden="true" />
            Dodaj atut
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
