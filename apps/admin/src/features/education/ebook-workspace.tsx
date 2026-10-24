"use client";

import { linesToList, listToLines } from "@/features/cms/lines";
import { SiteImageField } from "@/features/cms/site-image-field";
import { TextField } from "@/features/cms/text-field";
import { createClient } from "@/lib/supabase/client";
import {
  EBOOK_LIMITS,
  slugFromTitle,
  type EbookDraft,
} from "@repo/contracts/education";
import {
  ebookSampleUrl,
  educationImageUrl,
  uploadEbookSample,
} from "@repo/supabase/education";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { RichTextEditor } from "@repo/ui/rich-text-editor";
import { toast } from "@repo/ui/toast";
import { FileUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  deleteEbookAction,
  publishEbookAction,
  saveEbookDraftAction,
  unpublishEbookAction,
} from "./actions";
import { NaffyPriceChoice } from "./naffy-price-choice";
import { followsTitle, untitled } from "./view-model";
import {
  SectionLinks,
  useDraftWorkspace,
  WorkspaceBar,
  WorkspaceSection,
} from "./workspace-parts";

// An e-book in the portal, its sections down one page like an article's:
// the description (title, address, cover, short and long description, who
// it is for, what is inside, the format), the sale (the Naffy product and
// the film), the free sample (a PDF) and what Google and sharing show.

const SECTIONS = [
  { id: "opis", label: "Opis" },
  { id: "sprzedaz", label: "Naffy i film" },
  { id: "fragment", label: "Darmowy fragment" },
  { id: "seo", label: "Google i udostępnianie" },
] as const;

export interface EbookWorkspaceProps {
  id: string;
  initial: EbookDraft;
  published: boolean;
  publishedSlug: string | null;
  hasUnpublishedChanges: boolean;
}

export function EbookWorkspace(props: EbookWorkspaceProps) {
  const { id } = props;
  const { draft, change, actions, state } = useDraftWorkspace(props.initial, {
    published: props.published,
    hasUnpublishedChanges: props.hasUnpublishedChanges,
    save: (next) => saveEbookDraftAction(id, next),
    publish: () => publishEbookAction(id),
    unpublish: () => unpublishEbookAction(id),
    remove: () => deleteEbookAction(id),
  });
  const client = useMemo(() => createClient(), []);
  const imageUrl = (path: string) => educationImageUrl(client, path);
  // The list as typed (empty lines kept while typing); the draft keeps
  // the items.
  const [contents, setContents] = useState(listToLines(props.initial.contents));
  const [uploading, setUploading] = useState(false);

  function setTitle(title: string) {
    const follows = followsTitle(
      draft.slug,
      slugFromTitle(draft.title),
      Boolean(props.publishedSlug),
    );
    const slug = slugFromTitle(title);
    change(follows && slug.length >= 3 ? { title, slug } : { title });
  }

  async function uploadSample(file: File) {
    setUploading(true);
    try {
      change({ samplePath: await uploadEbookSample(client, file) });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Nie udało się wgrać pliku",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        actions={actions}
        previewHref={`/podglad?ebook=${id}`}
        back={{ href: "/ebooki", label: "E-booki" }}
        kind="e-book"
        state={state}
        title={untitled(draft.title)}
      />
      <SectionLinks sections={SECTIONS} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)]">
        <WorkspaceSection id="opis" title="Opis">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <TextField
                id="ebook-title"
                label="Tytuł"
                maxLength={EBOOK_LIMITS.title}
                onChange={setTitle}
                value={draft.title}
              />
              <TextField
                hint={
                  props.publishedSlug && props.publishedSlug !== draft.slug
                    ? `Po publikacji stary adres /edukacja/ebooki/${props.publishedSlug} przekieruje na nowy.`
                    : "Tworzy się z tytułu; małe litery, cyfry i myślniki."
                }
                id="ebook-slug"
                label="Adres: /edukacja/ebooki/…"
                maxLength={120}
                onChange={(slug) =>
                  change({ slug: slug.toLowerCase().replace(/\s+/g, "-") })
                }
                value={draft.slug}
              />
              <TextField
                hint="Na kartach e-booka (lista, pod artykułami) i w Google."
                id="ebook-short"
                label="Krótki opis"
                maxLength={EBOOK_LIMITS.shortDescription}
                multiline
                onChange={(shortDescription) => change({ shortDescription })}
                rows={3}
                value={draft.shortDescription}
              />
            </div>
            <SiteImageField
              folder="ebooks"
              hint="Okładka e-booka, pionowa (np. 2 : 3)."
              id="ebook-cover"
              label="Okładka"
              onChange={(patch) =>
                change({
                  ...(patch.imagePath !== undefined
                    ? { coverPath: patch.imagePath }
                    : {}),
                  ...(patch.imageAlt !== undefined
                    ? { coverAlt: patch.imageAlt }
                    : {}),
                })
              }
              value={{
                imagePath: draft.coverPath,
                imageUrl: draft.coverPath ? imageUrl(draft.coverPath) : null,
                imageAlt: draft.coverAlt,
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <p className="m-0 text-sm font-medium text-[var(--text)]">
              Opis na stronie e-booka
            </p>
            <RichTextEditor
              ariaLabel="Opis e-booka"
              onChange={(description) => change({ description })}
              placeholder="O czym jest e-book, co da czytelnikowi…"
              value={draft.description}
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <TextField
              id="ebook-audience"
              label="Dla kogo"
              maxLength={EBOOK_LIMITS.audience}
              multiline
              onChange={(audience) => change({ audience })}
              rows={4}
              value={draft.audience}
            />
            <TextField
              hint={`Jeden punkt w linijce, do ${EBOOK_LIMITS.contents}. Teraz: ${draft.contents.length}.`}
              id="ebook-contents"
              label="Co jest w środku"
              maxLength={
                EBOOK_LIMITS.contents * (EBOOK_LIMITS.contentsItem + 1)
              }
              multiline
              onChange={(text) => {
                setContents(text);
                change({ contents: linesToList(text) });
              }}
              rows={4}
              value={contents}
            />
            <TextField
              hint="Np. „PDF, 48 stron”."
              id="ebook-format"
              label="Format"
              maxLength={EBOOK_LIMITS.format}
              onChange={(format) => change({ format })}
              value={draft.format}
            />
          </div>
        </WorkspaceSection>

        <WorkspaceSection id="sprzedaz" title="Naffy i film">
          <div className="grid gap-3 lg:grid-cols-2">
            <TextField
              hint="Adres produktu na Naffy: tam przeniesie przycisk „Zobacz cenę i kup na Naffy”."
              id="ebook-naffy"
              label="Produkt na Naffy"
              maxLength={2048}
              onChange={(naffyUrl) => change({ naffyUrl })}
              value={draft.naffyUrl}
            />
            <TextField
              hint="Opcjonalnie: link do filmu na YouTube albo Vimeo. Wczytuje się dopiero po kliknięciu."
              id="ebook-video"
              label="Film"
              maxLength={300}
              onChange={(videoUrl) => change({ videoUrl })}
              value={draft.videoUrl}
            />
          </div>
          <NaffyPriceChoice
            naffyUrl={draft.naffyUrl}
            onChange={(showPrice) => change({ showPrice })}
            showPrice={draft.showPrice}
          />
        </WorkspaceSection>

        <WorkspaceSection
          id="fragment"
          note="PDF do 20 MB, do pobrania za darmo"
          title="Darmowy fragment"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {draft.samplePath ? (
              <a
                className="text-[var(--primary)] underline"
                href={ebookSampleUrl(
                  client,
                  draft.samplePath,
                  `${draft.slug || "fragment"}.pdf`,
                )}
                rel="noreferrer"
                target="_blank"
              >
                Pobierz wgrany fragment
              </a>
            ) : (
              <span className="text-[var(--text-muted)]">Brak fragmentu.</span>
            )}
            <label className={`${DETAIL_BUTTON} cursor-pointer`}>
              <FileUp aria-hidden="true" />
              {uploading
                ? "Wgrywam…"
                : draft.samplePath
                  ? "Zmień plik"
                  : "Wgraj PDF"}
              <input
                accept="application/pdf"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadSample(file);
                }}
                type="file"
              />
            </label>
            {draft.samplePath ? (
              <button
                className={DETAIL_BUTTON}
                onClick={() => change({ samplePath: null })}
                type="button"
              >
                Usuń
              </button>
            ) : null}
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          id="seo"
          note="puste pola biorą tytuł, krótki opis i okładkę"
          title="Google i udostępnianie"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <TextField
                hint={`Puste: „${untitled(draft.title)}”. Bez nazwy centrum: „| Kolor Sensu” dopisze się sam.`}
                id="ebook-seo-title"
                label="Tytuł w Google"
                maxLength={EBOOK_LIMITS.seoTitle}
                onChange={(seoTitle) => change({ seoTitle })}
                value={draft.seoTitle}
              />
              <TextField
                hint="Puste: krótki opis."
                id="ebook-seo-description"
                label="Opis w Google"
                maxLength={EBOOK_LIMITS.seoDescription}
                multiline
                onChange={(seoDescription) => change({ seoDescription })}
                value={draft.seoDescription}
              />
            </div>
            <SiteImageField
              decorative
              folder="ebooks"
              hint="Obrazek przy udostępnianiu linku, 1200 × 630. Pusty: okładka."
              id="ebook-og"
              label="Obrazek do udostępniania"
              onChange={(patch) =>
                patch.imagePath !== undefined
                  ? change({ ogImagePath: patch.imagePath })
                  : undefined
              }
              value={{
                imagePath: draft.ogImagePath,
                imageUrl: draft.ogImagePath
                  ? imageUrl(draft.ogImagePath)
                  : null,
                imageAlt: "",
              }}
            />
          </div>
        </WorkspaceSection>
      </div>
    </div>
  );
}
