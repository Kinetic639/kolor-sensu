"use client";

import {
  getHomeSectionsAction,
  publishHomeSectionsAction,
  updateHomeSectionsDraftAction,
} from "@/features/cms/actions";
import { homeSectionsKeys } from "@/features/cms/query-keys";
import type { HomeSectionsViewModel } from "@/features/cms/types";
import { createClient } from "@/lib/supabase/client";
import {
  homeSectionsContentSchema,
  type HomeSectionsContent,
} from "@repo/contracts";
import { supportAreaImageUrl, uploadSiteImage } from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { SectionHeader } from "@repo/ui/portal-content";
import { Switch } from "@repo/ui/switch";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Draft = HomeSectionsViewModel["spotlight"] & { showSpecialists: boolean };

function toDraft(content: HomeSectionsViewModel): Draft {
  return { ...content.spotlight, showSpecialists: content.showSpecialists };
}

function toContent({
  showSpecialists,
  imageUrl: _preview,
  ...spotlight
}: Draft): HomeSectionsContent {
  return { showSpecialists, spotlight };
}

/**
 * Home → the specialist sections: "Poznaj nasz zespół" (every specialist's
 * card) and "Z kim porozmawiasz" (one chosen specialist, with texts and,
 * optionally, a photo of its own). Each shows on its own switch.
 */
export function CmsHomeSectionsEditor({
  initialData,
}: {
  initialData: HomeSectionsViewModel;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const { data: content } = useQuery({
    queryKey: homeSectionsKeys.detail(),
    queryFn: () => getHomeSectionsAction(),
    initialData,
  });
  const [draft, setDraft] = useState<Draft>(() => toDraft(content));
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    setDraft(toDraft(content));
    setProblem(null);
  }, [content]);

  const isDirty =
    JSON.stringify(toContent(draft)) !==
    JSON.stringify(toContent(toDraft(content)));
  const chosen = content.specialists.find(
    (specialist) => specialist.id === draft.specialistId,
  );

  const saveMutation = useMutation({
    mutationFn: (input: HomeSectionsContent) =>
      updateHomeSectionsDraftAction(input),
    onSuccess: (next) => {
      queryClient.setQueryData(homeSectionsKeys.detail(), next);
      toast.success("Zapisano szkic");
    },
    onError: () => toast.error("Nie udało się zapisać ustawień"),
  });
  const publishMutation = useMutation({
    mutationFn: () => publishHomeSectionsAction(),
    onSuccess: (next) => {
      queryClient.setQueryData(homeSectionsKeys.detail(), next);
      toast.success("Sekcje specjalistów opublikowane");
    },
    onError: () => toast.error("Publikacja się nie powiodła"),
  });

  function change(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setProblem(null);
  }

  function save() {
    const result = homeSectionsContentSchema.safeParse(toContent(draft));
    if (!result.success) {
      setProblem(result.error.issues[0]?.message ?? "Popraw ustawienia sekcji");
      return;
    }
    saveMutation.mutate(result.data);
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const client = createClient();
      const path = await uploadSiteImage(client, file, "spotlight");
      change({ imagePath: path, imageUrl: supportAreaImageUrl(client, path) });
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
    <Card className="space-y-5 p-5">
      <SectionHeader
        title="Specjaliści na stronie głównej"
        description="Wybierz, które sekcje pokazać: karty wszystkich specjalistów, prezentację jednej osoby albo obie."
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

      <label className="flex min-h-11 items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2.5">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--text)]">
            Sekcja „Poznaj nasz zespół”
          </span>
          <span className="block text-xs text-[var(--text-muted)]">
            Karty specjalistów widocznych na stronie.
          </span>
        </span>
        <Switch
          aria-label="Sekcja „Poznaj nasz zespół”"
          checked={draft.showSpecialists}
          onCheckedChange={(checked) => change({ showSpecialists: checked })}
        />
      </label>

      <div className="space-y-4 rounded-[var(--radius-control)] border border-[var(--border)] p-4">
        <label className="flex items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--text)]">
              Sekcja „Z kim porozmawiasz”
            </span>
            <span className="block text-xs text-[var(--text-muted)]">
              Większa prezentacja jednej osoby: portret, opis, w czym pomaga, z
              kim pracuje.
            </span>
          </span>
          <Switch
            aria-label="Sekcja „Z kim porozmawiasz”"
            checked={draft.visible}
            onCheckedChange={(checked) => change({ visible: checked })}
          />
        </label>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-specialist`}>Specjalista</Label>
          <select
            id={`${id}-specialist`}
            className="h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            value={draft.specialistId ?? ""}
            aria-invalid={problem ? true : undefined}
            aria-describedby={`${id}-specialist-hint`}
            onChange={(event) =>
              change({ specialistId: event.target.value || null })
            }
          >
            <option value="">Wybierz specjalistę</option>
            {content.specialists.map((specialist) => (
              <option key={specialist.id} value={specialist.id}>
                {specialist.name}
                {specialist.onSite ? "" : " (niewidoczny na stronie)"}
              </option>
            ))}
          </select>
          <p
            id={`${id}-specialist-hint`}
            className={
              problem
                ? "text-xs text-[var(--danger)]"
                : "text-xs text-[var(--text-muted)]"
            }
          >
            {problem ??
              (chosen && !chosen.onSite
                ? "Ta osoba nie jest teraz na stronie (nieaktywna albo bez opublikowanego profilu), więc sekcja się nie pokaże."
                : "Imię, opis, specjalizacje i zdjęcie pochodzą z profilu specjalisty.")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-eyebrow`}>Nadtytuł</Label>
            <Input
              id={`${id}-eyebrow`}
              value={draft.eyebrow}
              maxLength={60}
              placeholder="Poznaj nasz zespół"
              onChange={(event) => change({ eyebrow: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-heading`}>Tytuł</Label>
            <Input
              id={`${id}-heading`}
              value={draft.heading}
              maxLength={100}
              placeholder="Z kim porozmawiasz"
              onChange={(event) => change({ heading: event.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-description`}>Podpis pod tytułem</Label>
          <Textarea
            id={`${id}-description`}
            value={draft.description}
            maxLength={300}
            rows={2}
            onChange={(event) => change({ description: event.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <div className="relative size-24 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)]">
            {draft.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a preview of the stored file
              <img
                src={draft.imageUrl}
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <span className="grid size-full place-items-center px-2 text-center text-xs text-[var(--text-muted)]">
                Zdjęcie z profilu
              </span>
            )}
          </div>
          <div className="grid content-start gap-2">
            <p className="text-xs text-[var(--text-muted)]">
              Własne zdjęcie tej sekcji (opcjonalnie): najlepiej wycięta postać
              na przezroczystym tle (PNG), jak portrety na kartach.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                <ImagePlus aria-hidden="true" className="size-4" />
                {uploading
                  ? "Wgrywanie…"
                  : draft.imagePath
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
              {draft.imagePath ? (
                <button
                  type="button"
                  className="text-xs text-[var(--text-muted)] underline"
                  onClick={() => change({ imagePath: null, imageUrl: null })}
                >
                  Usuń zdjęcie
                </button>
              ) : null}
            </div>
            {draft.imagePath ? (
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-alt`}>
                  Opis zdjęcia dla czytników ekranu
                </Label>
                <Input
                  id={`${id}-alt`}
                  value={draft.imageAlt}
                  maxLength={200}
                  onChange={(event) => change({ imageAlt: event.target.value })}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

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
