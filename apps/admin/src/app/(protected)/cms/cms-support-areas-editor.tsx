"use client";

import {
  getSupportAreasAction,
  publishSupportAreasAction,
  updateSupportAreasDraftAction,
} from "@/features/cms/actions";
import { supportAreasKeys } from "@/features/cms/query-keys";
import {
  addArea,
  moveArea,
  removeArea,
  problemsOf,
  toSupportAreasContent,
  updateArea,
  type Problems,
} from "@/features/cms/support-areas-editor";
import type {
  SupportAreaRow,
  SupportAreasViewModel,
} from "@/features/cms/types";
import { createClient } from "@/lib/supabase/client";
import { SUPPORT_AREAS_MAX, type SupportAreasContent } from "@repo/contracts";
import { supportAreaImageUrl, uploadSupportAreaImage } from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { SectionHeader } from "@repo/ui/portal-content";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

function AreaEditor({
  area,
  index,
  count,
  problems,
  onChange,
  onMove,
  onRemove,
}: {
  area: SupportAreaRow;
  index: number;
  count: number;
  problems: Problems;
  onChange: (patch: Partial<SupportAreaRow>) => void;
  onMove: (step: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const problem = (field: string) => problems[`${index}.${field}`];

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
    <li className="grid gap-4 rounded-[var(--radius-control)] border border-[var(--border)] p-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <div className="grid content-start justify-items-center gap-2">
        <div className="relative size-24 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
          {area.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a preview of the stored file
            <img
              src={area.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center px-2 text-center text-xs text-[var(--text-muted)]">
              Bez zdjęcia (plama w kolorach strony)
            </span>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
          <ImagePlus aria-hidden="true" className="size-4" />
          {uploading
            ? "Wgrywanie…"
            : area.imagePath
              ? "Zmień zdjęcie"
              : "Dodaj zdjęcie"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
        {area.imagePath ? (
          <button
            type="button"
            className="text-xs text-[var(--text-muted)] underline"
            onClick={() => onChange({ imagePath: null, imageUrl: null })}
          >
            Usuń zdjęcie
          </button>
        ) : null}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            Obszar {index + 1} z {count}
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Przesuń „${area.title || `obszar ${index + 1}`}” wyżej`}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Przesuń „${area.title || `obszar ${index + 1}`}” niżej`}
              disabled={index === count - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Usuń „${area.title || `obszar ${index + 1}`}”`}
              disabled={count === 1}
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-title`}>Nazwa</Label>
          <Input
            id={`${id}-title`}
            value={area.title}
            maxLength={60}
            aria-invalid={problem("title") ? true : undefined}
            aria-describedby={
              problem("title") ? `${id}-title-error` : undefined
            }
            onChange={(event) => onChange({ title: event.target.value })}
          />
          {problem("title") ? (
            <p
              id={`${id}-title-error`}
              className="text-xs text-[var(--danger)]"
            >
              {problem("title")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-lead`}>Opis w dużym kole</Label>
          <Textarea
            id={`${id}-lead`}
            value={area.lead}
            maxLength={240}
            rows={3}
            aria-invalid={problem("lead") ? true : undefined}
            aria-describedby={problem("lead") ? `${id}-lead-error` : undefined}
            onChange={(event) => onChange({ lead: event.target.value })}
          />
          {problem("lead") ? (
            <p id={`${id}-lead-error`} className="text-xs text-[var(--danger)]">
              {problem("lead")}
            </p>
          ) : null}
        </div>

        {area.imagePath ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-alt`}>
              Opis zdjęcia dla czytników ekranu
            </Label>
            <Input
              id={`${id}-alt`}
              value={area.imageAlt}
              maxLength={200}
              placeholder="np. Jasny gabinet z fotelem"
              onChange={(event) => onChange({ imageAlt: event.target.value })}
            />
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-href`}>Link (opcjonalnie)</Label>
            <Input
              id={`${id}-href`}
              value={area.link?.href ?? ""}
              placeholder="np. /warsztaty"
              aria-invalid={problem("href") ? true : undefined}
              aria-describedby={`${id}-href-hint`}
              onChange={(event) => {
                const href = event.target.value;
                onChange({
                  link:
                    href || area.link?.label
                      ? { href, label: area.link?.label ?? "" }
                      : null,
                });
              }}
            />
            <p
              id={`${id}-href-hint`}
              className={
                problem("href")
                  ? "text-xs text-[var(--danger)]"
                  : "text-xs text-[var(--text-muted)]"
              }
            >
              {problem("href") ?? "Puste: koło prowadzi do „Umów wizytę”."}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-label`}>Tekst linku</Label>
            <Input
              id={`${id}-label`}
              value={area.link?.label ?? ""}
              maxLength={40}
              placeholder="np. Zobacz warsztaty"
              disabled={!area.link}
              aria-invalid={problem("label") ? true : undefined}
              aria-describedby={
                problem("label") ? `${id}-label-error` : undefined
              }
              onChange={(event) =>
                onChange({
                  link: {
                    href: area.link?.href ?? "",
                    label: event.target.value,
                  },
                })
              }
            />
            {problem("label") ? (
              <p
                id={`${id}-label-error`}
                className="text-xs text-[var(--danger)]"
              >
                {problem("label")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Home → Obszary wsparcia: the small circles around the large one. Edit the
 * list, save it as a draft, then publish; the homepage refreshes at once.
 * Until the first publish the site shows its own areas.
 */
export function CmsSupportAreasEditor({
  initialData,
}: {
  initialData: SupportAreasViewModel;
}) {
  const queryClient = useQueryClient();
  const { data: content } = useQuery({
    queryKey: supportAreasKeys.detail(),
    queryFn: () => getSupportAreasAction(),
    initialData,
  });
  const [areas, setAreas] = useState<SupportAreaRow[]>(content.areas);
  const [problems, setProblems] = useState<Problems>({});
  useEffect(() => {
    setAreas(content.areas);
    setProblems({});
  }, [content.areas]);

  const isDirty =
    JSON.stringify(toSupportAreasContent(areas)) !==
    JSON.stringify(toSupportAreasContent(content.areas));

  const saveMutation = useMutation({
    mutationFn: (input: SupportAreasContent) =>
      updateSupportAreasDraftAction(input),
    onSuccess: (next) => {
      queryClient.setQueryData(supportAreasKeys.detail(), next);
      toast.success("Zapisano szkic");
    },
    onError: () => toast.error("Nie udało się zapisać obszarów"),
  });
  const publishMutation = useMutation({
    mutationFn: () => publishSupportAreasAction(),
    onSuccess: (next) => {
      queryClient.setQueryData(supportAreasKeys.detail(), next);
      toast.success("Obszary wsparcia opublikowane");
    },
    onError: () => toast.error("Publikacja się nie powiodła"),
  });

  function change(next: SupportAreaRow[]) {
    setAreas(next);
    if (Object.keys(problems).length > 0) setProblems(problemsOf(next));
  }

  function save() {
    const found = problemsOf(areas);
    setProblems(found);
    if (Object.keys(found).length > 0) {
      toast.error("Popraw zaznaczone pola");
      return;
    }
    saveMutation.mutate(toSupportAreasContent(areas));
  }

  return (
    <Card className="space-y-4 p-5">
      <SectionHeader
        title="Obszary wsparcia"
        description="Koła na stronie głównej: małe dookoła, a w dużym środkowym nazwa, opis i zdjęcie wybranego obszaru. Od 1 do 10 obszarów."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={content.isPublished ? "success" : "neutral"}>
          {content.isPublished ? "Opublikowane" : "Nieopublikowane"}
        </Badge>
        {content.isPublished && content.hasUnpublishedChanges ? (
          <Badge variant="warning">Niepublikowane zmiany</Badge>
        ) : null}
        <span className="text-xs text-[var(--text-muted)]">
          Ostatnia aktualizacja: {content.updatedAtLabel}
        </span>
        {content.publishedAtLabel ? (
          <span className="text-xs text-[var(--text-muted)]">
            Ostatnia publikacja: {content.publishedAtLabel}
          </span>
        ) : null}
      </div>
      {!content.isPublished ? (
        <p className="text-xs text-[var(--text-muted)]">
          Dopóki nic nie opublikujesz, strona pokazuje swoje domyślne obszary.
        </p>
      ) : null}

      <ul className="grid gap-3">
        {areas.map((area, index) => (
          <AreaEditor
            key={area.id}
            area={area}
            index={index}
            count={areas.length}
            problems={problems}
            onChange={(patch) => change(updateArea(areas, index, patch))}
            onMove={(step) => change([...moveArea(areas, index, step)])}
            onRemove={() => change(removeArea(areas, index))}
          />
        ))}
      </ul>

      <Button
        variant="outline"
        disabled={areas.length >= SUPPORT_AREAS_MAX}
        onClick={() => change(addArea(areas))}
      >
        <Plus aria-hidden="true" className="size-4" />
        Dodaj obszar
      </Button>

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!isDirty}
          loading={saveMutation.isPending}
          onClick={save}
          variant="secondary"
        >
          Zapisz szkic
        </Button>
        <Button
          disabled={isDirty || !content.hasUnpublishedChanges}
          loading={publishMutation.isPending}
          onClick={() => publishMutation.mutate()}
        >
          Publikuj
        </Button>
      </div>
      {isDirty ? (
        <p className="text-xs text-[var(--text-muted)]" role="status">
          Zapisz szkic, aby móc go opublikować.
        </p>
      ) : null}
    </Card>
  );
}
