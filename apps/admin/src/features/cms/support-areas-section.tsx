"use client";

import { SaveRow } from "@/features/center/fields";
import { createClient } from "@/lib/supabase/client";
import { useSave } from "@/lib/use-save";
import { SUPPORT_AREAS_MAX } from "@repo/contracts";
import { supportAreaImageUrl, uploadSupportAreaImage } from "@repo/supabase";
import {
  DETAIL_BUTTON,
  DETAIL_ICON_BUTTON,
  DetailSection,
  ROW_LINE,
} from "@repo/ui/detail-page";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { updateSupportAreasDraftAction } from "./actions";
import {
  addArea,
  moveArea,
  type Problems,
  problemsOf,
  removeArea,
  toSupportAreasContent,
  updateArea,
} from "./support-areas-editor";
import type { SupportAreaRow, SupportAreasViewModel } from "./types";

// Home → Obszary wsparcia: the small circles around the large one, one
// compact row each (photo, name and sentence, link, order); a row opens
// in place to edit it. Saved as a draft; the page bar publishes.

const NOTE = "text-[0.75rem]";

function Note({
  id,
  error,
  children,
}: {
  id: string;
  error?: string;
  children?: string;
}) {
  const text = error ?? children;
  if (!text) return null;
  return (
    <p
      className={cn(
        NOTE,
        error ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
      )}
      id={id}
    >
      {text}
    </p>
  );
}

function AreaFields({
  area,
  index,
  problems,
  onChange,
}: {
  area: SupportAreaRow;
  index: number;
  problems: Problems;
  onChange: (patch: Partial<SupportAreaRow>) => void;
}) {
  const id = `cms-area-${index}`;
  const problem = (field: string) => problems[`${index}.${field}`];
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const client = createClient();
      const path = await uploadSupportAreaImage(client, file);
      onChange({
        imagePath: path,
        imageUrl: supportAreaImageUrl(client, path),
      });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Nie udało się wgrać zdjęcia",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3.5 bg-[var(--surface-muted)] px-3.5 py-3 sm:grid-cols-2">
      <div className="grid content-start gap-1.5">
        <Label htmlFor={`${id}-title`}>Nazwa</Label>
        <Input
          aria-describedby={`${id}-title-note`}
          aria-invalid={problem("title") ? true : undefined}
          id={`${id}-title`}
          maxLength={60}
          onChange={(event) => onChange({ title: event.target.value })}
          value={area.title}
        />
        <Note error={problem("title")} id={`${id}-title-note`} />
      </div>
      <div className="grid content-start gap-1.5">
        <Label>Zdjęcie</Label>
        <div className="flex flex-wrap items-center gap-2">
          <label className={cn(DETAIL_BUTTON, "cursor-pointer")}>
            <ImagePlus aria-hidden="true" />
            {uploading ? "Wgrywanie…" : area.imagePath ? "Zmień" : "Dodaj"}
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }}
              type="file"
            />
          </label>
          {area.imagePath ? (
            <button
              className={DETAIL_BUTTON}
              onClick={() => onChange({ imagePath: null, imageUrl: null })}
              type="button"
            >
              Usuń
            </button>
          ) : (
            <span className={cn(NOTE, "text-[var(--text-muted)]")}>
              Bez zdjęcia: plama w kolorach strony.
            </span>
          )}
        </div>
      </div>
      <div className="grid content-start gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-lead`}>Opis w dużym kole</Label>
        <Textarea
          aria-describedby={`${id}-lead-note`}
          aria-invalid={problem("lead") ? true : undefined}
          id={`${id}-lead`}
          maxLength={240}
          onChange={(event) => onChange({ lead: event.target.value })}
          rows={2}
          value={area.lead}
        />
        <Note error={problem("lead")} id={`${id}-lead-note`} />
      </div>
      {area.imagePath ? (
        <div className="grid content-start gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-alt`}>Opis zdjęcia dla czytników ekranu</Label>
          <Input
            id={`${id}-alt`}
            maxLength={200}
            onChange={(event) => onChange({ imageAlt: event.target.value })}
            placeholder="np. Jasny gabinet z fotelem"
            value={area.imageAlt}
          />
        </div>
      ) : null}
      <div className="grid content-start gap-1.5">
        <Label htmlFor={`${id}-href`}>Link (opcjonalnie)</Label>
        <Input
          aria-describedby={`${id}-href-note`}
          aria-invalid={problem("href") ? true : undefined}
          id={`${id}-href`}
          onChange={(event) => {
            const href = event.target.value;
            onChange({
              link:
                href || area.link?.label
                  ? { href, label: area.link?.label ?? "" }
                  : null,
            });
          }}
          placeholder="np. /warsztaty"
          value={area.link?.href ?? ""}
        />
        <Note error={problem("href")} id={`${id}-href-note`}>
          Puste: koło prowadzi do „Umów wizytę”.
        </Note>
      </div>
      <div className="grid content-start gap-1.5">
        <Label htmlFor={`${id}-label`}>Tekst linku</Label>
        <Input
          aria-describedby={`${id}-label-note`}
          aria-invalid={problem("label") ? true : undefined}
          disabled={!area.link}
          id={`${id}-label`}
          maxLength={40}
          onChange={(event) =>
            onChange({
              link: { href: area.link?.href ?? "", label: event.target.value },
            })
          }
          placeholder="np. Zobacz warsztaty"
          value={area.link?.label ?? ""}
        />
        <Note error={problem("label")} id={`${id}-label-note`} />
      </div>
    </div>
  );
}

export function SupportAreasSection({
  content,
}: {
  content: SupportAreasViewModel;
}) {
  const { isPending, run } = useSave();
  const [areas, setAreas] = useState<SupportAreaRow[]>(content.areas);
  const [saved, setSaved] = useState(content.areas);
  const [open, setOpen] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problems>({});
  const dirty =
    JSON.stringify(toSupportAreasContent(areas)) !==
    JSON.stringify(toSupportAreasContent(saved));

  function change(next: SupportAreaRow[]) {
    setAreas(next);
    if (Object.keys(problems).length > 0) setProblems(problemsOf(next));
  }

  return (
    <DetailSection
      actions={
        <button
          className={DETAIL_BUTTON}
          disabled={areas.length >= SUPPORT_AREAS_MAX}
          onClick={() => {
            const next = addArea(areas);
            change(next);
            setOpen(next.at(-1)!.id);
          }}
          type="button"
        >
          <Plus aria-hidden="true" />
          Dodaj obszar
        </button>
      }
      note={`koła pod myślami · ${areas.length} z ${SUPPORT_AREAS_MAX}`}
      title="Obszary wsparcia"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const found = problemsOf(areas);
          setProblems(found);
          const first = Object.keys(found)[0]?.split(".")[0];
          if (first !== undefined && first !== "list") {
            setOpen(areas[Number(first)]?.id ?? null);
            toast.error("Popraw zaznaczone pola");
            return;
          }
          run(
            () => updateSupportAreasDraftAction(toSupportAreasContent(areas)),
            "Zapisano szkic",
            () => setSaved(areas),
          );
        }}
      >
        <ul>
          {areas.map((area, index) => {
            const isOpen = open === area.id;
            const name = area.title || `Obszar ${index + 1}`;
            const wrong = Object.keys(problems).some((key) =>
              key.startsWith(`${index}.`),
            );
            return (
              <li className={cn("border-b", ROW_LINE)} key={area.id}>
                <div className="flex min-h-10 items-center gap-2.5 px-3.5 py-1">
                  <span className="relative size-7 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--primary-soft,var(--surface-muted))]">
                    {area.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a preview of the stored file
                      <img
                        alt=""
                        className="size-full object-cover"
                        src={area.imageUrl}
                      />
                    ) : null}
                  </span>
                  <button
                    aria-expanded={isOpen}
                    className="grid min-w-0 flex-1 text-left"
                    onClick={() => setOpen(isOpen ? null : area.id)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "truncate text-[0.8125rem] font-medium",
                        wrong ? "text-[var(--danger)]" : "text-[var(--text)]",
                      )}
                    >
                      {name}
                    </span>
                    <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
                      {area.lead || "Bez opisu"}
                    </span>
                  </button>
                  <span className="hidden shrink-0 text-[0.75rem] text-[var(--text-muted)] sm:inline">
                    {area.link?.href || "→ Umów wizytę"}
                  </span>
                  <button
                    aria-label={`Przesuń „${name}” wyżej`}
                    className={DETAIL_ICON_BUTTON}
                    disabled={index === 0}
                    onClick={() => change([...moveArea(areas, index, -1)])}
                    type="button"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    aria-label={`Przesuń „${name}” niżej`}
                    className={DETAIL_ICON_BUTTON}
                    disabled={index === areas.length - 1}
                    onClick={() => change([...moveArea(areas, index, 1)])}
                    type="button"
                  >
                    <ArrowDown />
                  </button>
                  <button
                    aria-expanded={isOpen}
                    aria-label={`Edytuj „${name}”`}
                    className={DETAIL_ICON_BUTTON}
                    onClick={() => setOpen(isOpen ? null : area.id)}
                    type="button"
                  >
                    <Pencil />
                  </button>
                  <button
                    aria-label={`Usuń „${name}”`}
                    className={DETAIL_ICON_BUTTON}
                    disabled={areas.length === 1}
                    onClick={() => change(removeArea(areas, index))}
                    type="button"
                  >
                    <Trash2 />
                  </button>
                </div>
                {isOpen ? (
                  <AreaFields
                    area={area}
                    index={index}
                    onChange={(patch) =>
                      change(updateArea(areas, index, patch))
                    }
                    problems={problems}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="px-3.5 py-2.5">
          <SaveRow dirty={dirty} pending={isPending}>
            Zapisz szkic
          </SaveRow>
        </div>
      </form>
    </DetailSection>
  );
}
