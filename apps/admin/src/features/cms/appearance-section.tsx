"use client";

import { SaveRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import { siteAppearanceContentSchema } from "@repo/contracts";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updateSiteAppearanceDraftAction } from "./actions";
import {
  toSiteAppearanceContent,
  type SiteAppearanceDraft,
} from "./appearance-editor";
import { CmsSection } from "./cms-section";
import { SiteImageField } from "./site-image-field";
import type { ContentViewModel } from "./types";

// "Ustawienia wspólne" → the painted photo ("Zdjęcie z akwarelą", the
// site's WatercolorImage): its watercolor backdrop (none: the site's own)
// and an optional layer over the photo's edges that moves on scroll
// (parallax), both transparent images in the backdrop's 16 : 10 frame, with
// a preview of the two around the photo's place. Saved as a
// draft; the tab's bar publishes it for every page.

const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** The site's own backdrop, as the site serves it. */
const defaultBackdropUrl = new URL(
  "/watercolor/watercolor-background.webp",
  webUrl,
).toString();

const TRANSPARENT = "image/png,image/webp";

export function AppearanceSection({
  model,
}: {
  model: ContentViewModel<SiteAppearanceDraft>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<SiteAppearanceDraft>(model.content);
  const [saved, setSaved] = useState<SiteAppearanceDraft>(model.content);
  const dirty =
    JSON.stringify(toSiteAppearanceContent(draft)) !==
    JSON.stringify(toSiteAppearanceContent(saved));
  const change = (patch: Partial<SiteAppearanceDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  return (
    <CmsSection
      defaultOpen
      note="tło i warstwa parallaxy zdjęć z akwarelą na wszystkich stronach"
      title="Wygląd komponentów · Zdjęcie z akwarelą"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = siteAppearanceContentSchema.safeParse(
            toSiteAppearanceContent(draft),
          );
          if (!result.success) {
            toast.error("Sprawdź zaznaczone pola");
            return;
          }
          run(
            () => updateSiteAppearanceDraftAction(result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
          <p className="text-[0.75rem] text-[var(--text-muted)] sm:col-span-2">
            Zdjęcie z akwarelą jest m.in. na stronie głównej, w O nas, w
            ofercie, w Warsztatach i w Kontakcie. Zmiana dotyczy wszystkich tych
            miejsc naraz.
          </p>
          <SiteImageField
            accept={TRANSPARENT}
            decorative
            folder="appearance"
            hint="PNG lub WebP z przezroczystym tłem, przycięty do krawędzi farby, poziomy: najlepiej 16 : 10 (np. 1600 × 1000 px), inny kształt zostanie rozciągnięty. Do 5 MB. Bez niego: tło strony."
            id="cms-appearance-backdrop"
            label="Tło akwareli"
            onChange={(patch) =>
              change({
                ...("imagePath" in patch
                  ? { watercolorBackdropPath: patch.imagePath ?? null }
                  : {}),
                ...("imageUrl" in patch
                  ? { watercolorBackdropUrl: patch.imageUrl ?? null }
                  : {}),
              })
            }
            removeLabel="Przywróć domyślne"
            value={{
              imagePath: draft.watercolorBackdropPath,
              imageUrl: draft.watercolorBackdropUrl,
              imageAlt: "",
            }}
          />
          <SiteImageField
            accept={TRANSPARENT}
            decorative
            folder="appearance"
            hint="Opcjonalna, np. krople farby: przezroczysty PNG lub WebP w kształcie tła. Leży na brzegach zdjęcia i przy przewijaniu przesuwa się inaczej niż tło."
            id="cms-appearance-parallax"
            label="Warstwa parallaxy"
            onChange={(patch) =>
              change({
                ...("imagePath" in patch
                  ? { watercolorParallaxPath: patch.imagePath ?? null }
                  : {}),
                ...("imageUrl" in patch
                  ? { watercolorParallaxUrl: patch.imageUrl ?? null }
                  : {}),
              })
            }
            value={{
              imagePath: draft.watercolorParallaxPath,
              imageUrl: draft.watercolorParallaxUrl,
              imageAlt: "",
            }}
          />
          <div
            aria-label="Podgląd tła i warstwy parallaxy"
            className="relative aspect-[16/10] w-full max-w-[24rem] overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--surface-muted)] sm:col-span-2"
            role="group"
          >
            {/* eslint-disable @next/next/no-img-element -- previews of the stored files */}
            <img
              alt=""
              className="absolute inset-0 size-full object-fill"
              src={draft.watercolorBackdropUrl ?? defaultBackdropUrl}
            />
            {/* Where the photo sits in the backdrop's frame (public-site.css). */}
            <div className="absolute top-[4.1%] left-[7.36%] grid h-[90.8%] w-[85.2%] place-items-center rounded-[4px] bg-[var(--text-muted)]/45 text-[0.75rem] text-[var(--surface)]">
              zdjęcie
            </div>
            {draft.watercolorParallaxUrl ? (
              <img
                alt=""
                className="absolute inset-0 size-full object-fill"
                src={draft.watercolorParallaxUrl}
              />
            ) : null}
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <SaveRow dirty={dirty} pending={isPending}>
            Zapisz szkic
          </SaveRow>
        </div>
      </form>
    </CmsSection>
  );
}
