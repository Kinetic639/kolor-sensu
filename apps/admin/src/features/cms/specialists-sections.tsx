"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { createClient } from "@/lib/supabase/client";
import { useSave } from "@/lib/use-save";
import {
  homeSectionsContentSchema,
  type HomeSectionsContent,
} from "@repo/contracts";
import { supportAreaImageUrl, uploadSiteImage } from "@repo/supabase";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { CmsSection } from "./cms-section";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import { ImagePlus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { updateHomeSectionsDraftAction } from "./actions";
import type { HomeSectionsViewModel } from "./types";

// Home → "Z kim porozmawiasz" (one chosen specialist at length) and
// "Poznaj nasz zespół" (every specialist's card), each on its own switch.
// They sit next to each other on the page and share one draft, so one
// form holds both and saves them together.

type Draft = HomeSectionsViewModel["spotlight"] & { showSpecialists: boolean };

const NONE = "none";

function toContent({
  showSpecialists,
  imageUrl: _preview,
  ...spotlight
}: Draft): HomeSectionsContent {
  return { showSpecialists, spotlight };
}

export function SpecialistsSections({
  content,
  spotlightHeader,
  teamHeader,
}: {
  content: HomeSectionsViewModel;
  /** Each section's header block (HeaderBlock), at its top. */
  spotlightHeader?: ReactNode;
  teamHeader?: ReactNode;
}) {
  const { isPending, run } = useSave();
  const initial: Draft = {
    ...content.spotlight,
    showSpecialists: content.showSpecialists,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const dirty =
    JSON.stringify(toContent(draft)) !== JSON.stringify(toContent(saved));
  const chosen = content.specialists.find(
    (specialist) => specialist.id === draft.specialistId,
  );

  function change(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setProblem(null);
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

  const hint = problem
    ? problem
    : chosen && !chosen.onSite
      ? "Ta osoba nie jest teraz na stronie (nieaktywna albo bez opublikowanego profilu), więc sekcja się nie pokaże."
      : "Imię, opis, specjalizacje i zdjęcie pochodzą z profilu specjalisty.";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = homeSectionsContentSchema.safeParse(toContent(draft));
        if (!result.success) {
          setProblem(result.error.issues[0]?.message ?? "Popraw ustawienia");
          return;
        }
        run(
          () => updateHomeSectionsDraftAction(result.data),
          "Zapisano szkic",
          () => setSaved(draft),
        );
      }}
    >
      <CmsSection
        note="jedna osoba, większy portret"
        title="Z kim porozmawiasz"
      >
        {spotlightHeader}
        <SwitchRow
          checked={draft.visible}
          description="Prezentacja wybranej osoby: portret, opis, w czym pomaga, z kim pracuje."
          label="Pokaż sekcję"
          onCheckedChange={(visible) => change({ visible })}
        />
        <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
          <div className="grid content-start gap-1.5 sm:col-span-2">
            <Label htmlFor="cms-spotlight-specialist">Specjalista</Label>
            <Select
              onValueChange={(value) =>
                change({ specialistId: value === NONE ? null : value })
              }
              value={draft.specialistId ?? NONE}
            >
              <SelectTrigger
                aria-describedby="cms-spotlight-specialist-note"
                aria-invalid={problem ? true : undefined}
                id="cms-spotlight-specialist"
              >
                <SelectValue>
                  {chosen
                    ? `${chosen.name}${chosen.onSite ? "" : " (niewidoczny na stronie)"}`
                    : "Wybierz specjalistę"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Wybierz specjalistę</SelectItem>
                {content.specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    {specialist.name}
                    {specialist.onSite ? "" : " (niewidoczny na stronie)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p
              className={cn(
                "text-[0.75rem]",
                problem ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
              )}
              id="cms-spotlight-specialist-note"
            >
              {hint}
            </p>
          </div>
          <div className="grid content-start gap-1.5 sm:col-span-2">
            <Label>Własne zdjęcie (opcjonalnie)</Label>
            <div className="flex flex-wrap items-center gap-2">
              {draft.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a preview of the stored file
                <img
                  alt=""
                  className="size-10 rounded-[5px] border border-[var(--border)] object-contain"
                  src={draft.imageUrl}
                />
              ) : null}
              <label className={cn(DETAIL_BUTTON, "cursor-pointer")}>
                <ImagePlus aria-hidden="true" />
                {uploading ? "Wgrywanie…" : draft.imagePath ? "Zmień" : "Dodaj"}
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
              {draft.imagePath ? (
                <button
                  className={DETAIL_BUTTON}
                  onClick={() => change({ imagePath: null, imageUrl: null })}
                  type="button"
                >
                  Usuń
                </button>
              ) : null}
              <span className="text-[0.75rem] text-[var(--text-muted)]">
                Najlepiej wycięta postać na przezroczystym tle (PNG), jak
                portrety na kartach. Bez niego: portret z profilu.
              </span>
            </div>
          </div>
          {draft.imagePath ? (
            <div className="grid content-start gap-1.5 sm:col-span-2">
              <Label htmlFor="cms-spotlight-alt">
                Opis zdjęcia dla czytników ekranu
              </Label>
              <Input
                id="cms-spotlight-alt"
                maxLength={200}
                onChange={(event) => change({ imageAlt: event.target.value })}
                value={draft.imageAlt}
              />
            </div>
          ) : null}
        </div>
        <div className="px-3.5 py-2.5">
          <SaveRow dirty={dirty} pending={isPending}>
            Zapisz szkic obu sekcji
          </SaveRow>
        </div>
      </CmsSection>
      <CmsSection
        note="karty wszystkich specjalistów"
        title="Poznaj nasz zespół"
      >
        {teamHeader}
        <SwitchRow
          checked={draft.showSpecialists}
          description="Karty specjalistów widocznych na stronie (aktywnych, z opublikowanym profilem)."
          label="Pokaż sekcję"
          onCheckedChange={(showSpecialists) => change({ showSpecialists })}
        />
        <div className="px-3.5 py-2.5">
          <SaveRow dirty={dirty} pending={isPending}>
            Zapisz szkic obu sekcji
          </SaveRow>
        </div>
      </CmsSection>
    </form>
  );
}
