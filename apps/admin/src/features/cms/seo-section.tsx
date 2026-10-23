"use client";

import { SaveRow, SwitchRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import {
  pageSeoContentSchema,
  resolvePageSeo,
  SEO_DESCRIPTION_RECOMMENDED,
  SEO_TITLE_RECOMMENDED,
  type SeoPage,
} from "@repo/contracts";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { cn } from "@repo/ui/lib/utils";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { useState } from "react";
import { updatePageSeoDraftAction } from "./actions";
import { CmsSection } from "./cms-section";
import {
  characterCount,
  seoPreview,
  toPageSeoContent,
  type PageSeoDraft,
} from "./seo-editor";
import { SiteImageField } from "./site-image-field";
import type { ContentViewModel } from "./types";

// A page's "Wyszukiwarka i udostępnianie": the title and description
// Google shows, those a shared link shows and its picture, and whether
// search engines may index the page, with a preview of a Google result and
// of a shared link. Every field may stay empty: the page's own words (in
// grey in the field) and its generated picture. Saved as a draft; the
// page bar publishes.

const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** A text with its counter, which warns once Google would cut it. */
function CountedField({
  id,
  label,
  hint,
  value,
  placeholder,
  recommended,
  maxLength,
  multiline = false,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  recommended: number;
  maxLength: number;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const count = characterCount(value, recommended);
  const shared = {
    id,
    maxLength,
    value,
    placeholder,
    "aria-describedby": `${id}-count ${id}-hint`,
  } as const;
  return (
    <div className="grid content-start gap-1.5 sm:col-span-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span
          className={cn(
            "text-[0.75rem] tabular-nums",
            count.tooLong
              ? "font-medium text-[var(--warning-foreground)]"
              : "text-[var(--text-muted)]",
          )}
          id={`${id}-count`}
        >
          {count.label}
          {count.tooLong ? " · za długi, Google utnie koniec" : ""}
        </span>
      </div>
      {multiline ? (
        <Textarea
          {...shared}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
        />
      ) : (
        <Input {...shared} onChange={(event) => onChange(event.target.value)} />
      )}
      <p className="text-[0.75rem] text-[var(--text-muted)]" id={`${id}-hint`}>
        {hint}
      </p>
    </div>
  );
}

const PREVIEW =
  "grid gap-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:col-span-2";
const PREVIEW_LABEL =
  "text-[0.6875rem] font-medium tracking-wide text-[var(--text-muted)] uppercase";

export function SeoSection({
  page,
  model,
}: {
  page: SeoPage;
  model: ContentViewModel<PageSeoDraft>;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<PageSeoDraft>(model.content);
  const [saved, setSaved] = useState<PageSeoDraft>(model.content);
  const dirty =
    JSON.stringify(toPageSeoContent(draft)) !==
    JSON.stringify(toPageSeoContent(saved));
  const change = (patch: Partial<PageSeoDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const id = `cms-seo-${page}`;
  const content = toPageSeoContent(draft);
  // The page's own words, as the fields' placeholders: what shows when
  // a field stays empty.
  const own = resolvePageSeo(page, null);
  const shared = resolvePageSeo(page, {
    ...content,
    ogTitle: "",
    ogDescription: "",
  });
  const preview = seoPreview(page, content, webUrl);

  return (
    <CmsSection
      note="tytuł i opis w Google, wygląd linku udostępnionego np. na Facebooku"
      title="Wyszukiwarka i udostępnianie"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const result = pageSeoContentSchema.safeParse(content);
          if (!result.success) {
            toast.error(
              result.error.issues[0]?.message ?? "Sprawdź zaznaczone pola",
            );
            return;
          }
          run(
            () => updatePageSeoDraftAction(page, result.data),
            "Zapisano szkic",
            () => setSaved(draft),
          );
        }}
      >
        <fieldset className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
          <legend className="px-0 pb-1 text-[0.8125rem] font-semibold">
            W wynikach wyszukiwania
          </legend>
          <CountedField
            hint="Niebieski tytuł w Google i nazwa karty w przeglądarce. Puste: tytuł podany w szarym."
            id={`${id}-title`}
            label="Tytuł w Google"
            maxLength={120}
            onChange={(title) => change({ title })}
            placeholder={own.title}
            recommended={SEO_TITLE_RECOMMENDED}
            value={draft.title}
          />
          <CountedField
            hint="Dwa zdania pod tytułem: o czym jest strona i dlaczego warto ją otworzyć. Puste: opis podany w szarym."
            id={`${id}-description`}
            label="Opis w Google"
            maxLength={320}
            multiline
            onChange={(description) => change({ description })}
            placeholder={own.description}
            recommended={SEO_DESCRIPTION_RECOMMENDED}
            value={draft.description}
          />
          <div
            aria-label="Podgląd wyniku w Google"
            className={PREVIEW}
            role="group"
          >
            <span className={PREVIEW_LABEL}>Podgląd w Google</span>
            <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
              {preview.breadcrumb}
            </span>
            <span className="text-[1.0625rem] leading-snug text-[var(--primary)]">
              {preview.title}
            </span>
            <span className="text-[0.8125rem] leading-snug text-[var(--text)]">
              {preview.description}
            </span>
          </div>
        </fieldset>
        <fieldset className="grid gap-3.5 border-t border-[var(--border)] px-3.5 py-3 sm:grid-cols-2">
          <legend className="px-0 pb-1 text-[0.8125rem] font-semibold">
            Przy udostępnianiu linku
          </legend>
          <p className="text-[0.75rem] text-[var(--text-muted)] sm:col-span-2">
            Facebook, Messenger, WhatsApp, LinkedIn i inne pokazują link jako
            kartę z obrazkiem, tytułem i opisem.
          </p>
          <CountedField
            hint="Puste: tytuł w Google."
            id={`${id}-og-title`}
            label="Tytuł przy udostępnianiu"
            maxLength={120}
            onChange={(ogTitle) => change({ ogTitle })}
            placeholder={shared.ogTitle}
            recommended={SEO_TITLE_RECOMMENDED}
            value={draft.ogTitle}
          />
          <CountedField
            hint="Puste: opis w Google."
            id={`${id}-og-description`}
            label="Opis przy udostępnianiu"
            maxLength={320}
            multiline
            onChange={(ogDescription) => change({ ogDescription })}
            placeholder={shared.ogDescription}
            recommended={SEO_DESCRIPTION_RECOMMENDED}
            value={draft.ogDescription}
          />
          <SiteImageField
            folder="seo"
            hint="Poziomy, najlepiej 1200 × 630 px. Bez niego: obrazek strony z logo i nazwą."
            id={`${id}-og-image`}
            label="Obrazek przy udostępnianiu"
            onChange={(patch) =>
              change({
                ...("imagePath" in patch
                  ? { ogImagePath: patch.imagePath ?? null }
                  : {}),
                ...("imageUrl" in patch
                  ? { ogImageUrl: patch.imageUrl ?? null }
                  : {}),
                ...("imageAlt" in patch
                  ? { ogImageAlt: patch.imageAlt ?? "" }
                  : {}),
              })
            }
            value={{
              imagePath: draft.ogImagePath,
              imageUrl: draft.ogImageUrl,
              imageAlt: draft.ogImageAlt,
            }}
          />
          <div
            aria-label="Podgląd udostępnionego linku"
            className="grid max-w-[30rem] overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--surface)] sm:col-span-2"
            role="group"
          >
            {draft.ogImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a preview of the stored file
              <img
                alt=""
                className="aspect-[1200/630] w-full object-cover"
                src={draft.ogImageUrl}
              />
            ) : (
              <div className="grid aspect-[1200/630] w-full place-items-center bg-[var(--surface-muted)] px-4 text-center text-[0.75rem] text-[var(--text-muted)]">
                Obrazek strony: logo, nazwa Kolor Sensu i tytuł strony
              </div>
            )}
            <div className="grid gap-0.5 border-t border-[var(--border)] px-3 py-2">
              <span className={PREVIEW_LABEL}>{preview.domain}</span>
              <span className="text-[0.875rem] leading-snug font-semibold text-[var(--text)]">
                {preview.ogTitle}
              </span>
              <span className="text-[0.75rem] leading-snug text-[var(--text-muted)]">
                {preview.ogDescription}
              </span>
            </div>
          </div>
        </fieldset>
        <div className="border-t border-[var(--border)]">
          <SwitchRow
            checked={draft.noindex}
            description="Google i inne wyszukiwarki nie pokażą jej w wynikach, a mapa strony (sitemap) jej nie wymieni. Zwykle zostaw wyłączone."
            label="Ukryj stronę przed wyszukiwarkami"
            onCheckedChange={(noindex) => change({ noindex })}
          />
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
