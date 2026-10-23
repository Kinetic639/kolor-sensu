"use client";

import { SiteImageField } from "@/features/cms/site-image-field";
import { TextField } from "@/features/cms/text-field";
import { createClient } from "@/lib/supabase/client";
import {
  ARTICLE_LIMITS_META,
  TEAM_AUTHOR_NAME,
  slugFromTitle,
  type ArticleCategory,
  type ArticleDraft,
  type ArticleSource,
} from "@repo/contracts/education";
import {
  educationImageUrl,
  uploadEducationImage,
} from "@repo/supabase/education";
import { ArticleEditor } from "@repo/ui/article-editor";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import {
  deleteArticleAction,
  publishArticleAction,
  saveArticleDraftAction,
  unpublishArticleAction,
} from "./actions";
import { followsTitle, untitled, type SpecialistOption } from "./view-model";
import {
  CheckList,
  imageSize,
  SectionLinks,
  SelectField,
  useDraftWorkspace,
  WORKSPACE_FIELD,
  WorkspaceBar,
  WorkspaceSection,
} from "./workspace-parts";

// An article in the portal, its sections down one page (one draft, one
// save, so moving between them never loses what was typed): the basics
// (title, address, lead, cover, category), the text in the article editor,
// the people and links (author, reviewer, sources, services, specialists,
// e-book) and what Google and sharing show. The bar saves the draft,
// publishes it (saving first), withdraws or deletes it.

const SECTIONS = [
  { id: "podstawy", label: "Podstawy" },
  { id: "tresc", label: "Treść" },
  { id: "ludzie", label: "Ludzie i powiązania" },
  { id: "seo", label: "Google i udostępnianie" },
] as const;

export interface ArticleWorkspaceProps {
  id: string;
  initial: ArticleDraft;
  published: boolean;
  /** The published address (null until first published). */
  publishedSlug: string | null;
  hasUnpublishedChanges: boolean;
  categories: readonly ArticleCategory[];
  specialists: readonly SpecialistOption[];
  services: readonly { id: string; slug: string; name: string }[];
  ebooks: readonly { id: string; title: string }[];
}

export function ArticleWorkspace(props: ArticleWorkspaceProps) {
  const { id } = props;
  const { draft, change, actions, state } = useDraftWorkspace(props.initial, {
    published: props.published,
    hasUnpublishedChanges: props.hasUnpublishedChanges,
    save: (next) => saveArticleDraftAction(id, next),
    publish: () => publishArticleAction(id),
    unpublish: () => unpublishArticleAction(id),
    remove: () => deleteArticleAction(id),
  });
  const client = useMemo(() => createClient(), []);
  const imageUrl = (path: string) => educationImageUrl(client, path);

  function setTitle(title: string) {
    // The address follows the title until it is changed by hand, and never
    // once the article was published (its address is kept, or redirected).
    const follows = followsTitle(
      draft.slug,
      slugFromTitle(draft.title),
      Boolean(props.publishedSlug),
    );
    const slug = slugFromTitle(title);
    change(follows && slug.length >= 3 ? { title, slug } : { title });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        actions={actions}
        previewHref={`/podglad?artykul=${id}`}
        back={{ href: "/artykuly", label: "Artykuły" }}
        kind="artykuł"
        state={state}
        title={untitled(draft.title)}
      />
      <SectionLinks sections={SECTIONS} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)]">
        <WorkspaceSection id="podstawy" title="Podstawy">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <TextField
                id="article-title"
                label="Tytuł"
                maxLength={ARTICLE_LIMITS_META.title}
                onChange={setTitle}
                value={draft.title}
              />
              <TextField
                hint={
                  props.publishedSlug && props.publishedSlug !== draft.slug
                    ? `Po publikacji stary adres /edukacja/artykuly/${props.publishedSlug} przekieruje na nowy.`
                    : "Tworzy się z tytułu; małe litery, cyfry i myślniki."
                }
                id="article-slug"
                label="Adres: /edukacja/artykuly/…"
                maxLength={120}
                onChange={(slug) =>
                  change({ slug: slug.toLowerCase().replace(/\s+/g, "-") })
                }
                value={draft.slug}
              />
              <TextField
                hint="Krótko, o czym jest artykuł: pod tytułem, na listach i w Google."
                id="article-lead"
                label="Wstęp"
                maxLength={ARTICLE_LIMITS_META.lead}
                multiline
                onChange={(lead) => change({ lead })}
                rows={3}
                value={draft.lead}
              />
              <SelectField
                id="article-category"
                label="Kategoria"
                onChange={(categoryId) =>
                  change({ categoryId: categoryId || null })
                }
                options={[
                  { value: "", label: "Wybierz kategorię" },
                  ...props.categories.map((one) => ({
                    value: one.id,
                    label: one.name,
                  })),
                ]}
                value={draft.categoryId ?? ""}
                hint={
                  props.categories.length === 0
                    ? "Nie ma jeszcze kategorii: dodaj je w Artykuły → Kategorie."
                    : undefined
                }
              />
            </div>
            <SiteImageField
              folder="articles"
              hint="Okładka: nad artykułem i na listach. Poziome zdjęcie, najlepiej 3 : 2."
              id="article-cover"
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
        </WorkspaceSection>

        <WorkspaceSection
          id="tresc"
          note="„/” albo „Wstaw”: zdjęcie, ramka, tabela, przycisk"
          title="Treść"
        >
          <ArticleEditor
            imageUrl={imageUrl}
            onChange={(body) => change({ body })}
            services={props.services}
            uploadImage={async (file) => {
              const size = await imageSize(file);
              const src = await uploadEducationImage(client, file, "articles");
              return { src, ...size };
            }}
            value={draft.body}
          />
        </WorkspaceSection>

        <WorkspaceSection id="ludzie" title="Ludzie i powiązania">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <SelectField
                id="article-author"
                label="Autor"
                onChange={(value) =>
                  value === "team"
                    ? change({ authorKind: "team", authorSpecialistId: null })
                    : change({
                        authorKind: "specialist",
                        authorSpecialistId: value,
                      })
                }
                options={[
                  { value: "team", label: TEAM_AUTHOR_NAME },
                  ...props.specialists.map((one) => ({
                    value: one.id,
                    label: one.name,
                  })),
                ]}
                value={
                  draft.authorKind === "team"
                    ? "team"
                    : (draft.authorSpecialistId ?? "team")
                }
              />
              <SelectField
                hint="Opcjonalnie: specjalista, który sprawdził tekst („Sprawdzone przez”)."
                id="article-reviewer"
                label="Recenzent"
                onChange={(value) =>
                  change({ reviewerSpecialistId: value || null })
                }
                options={[
                  { value: "", label: "Bez recenzenta" },
                  ...props.specialists.map((one) => ({
                    value: one.id,
                    label: one.name,
                  })),
                ]}
                value={draft.reviewerSpecialistId ?? ""}
              />
              <SelectField
                hint="Pod artykułem pojawi się jego karta."
                id="article-ebook"
                label="Polecany e-book"
                onChange={(value) => change({ ebookId: value || null })}
                options={[
                  { value: "", label: "Bez e-booka" },
                  ...props.ebooks.map((one) => ({
                    value: one.id,
                    label: one.title,
                  })),
                ]}
                value={draft.ebookId ?? ""}
              />
            </div>
            <div className="grid content-start gap-4">
              <CheckList
                chosen={draft.serviceIds}
                empty="Nie ma jeszcze usług."
                legend="Powiązane usługi (pod artykułem, z „Umów wizytę”)"
                onChange={(serviceIds) => change({ serviceIds })}
                options={props.services.map((one) => ({
                  value: one.id,
                  label: one.name,
                }))}
              />
              <CheckList
                chosen={draft.specialistIds}
                empty="Nie ma jeszcze specjalistów."
                legend="Polecani specjaliści"
                onChange={(specialistIds) => change({ specialistIds })}
                options={props.specialists.map((one) => ({
                  value: one.id,
                  label: one.name,
                }))}
              />
            </div>
          </div>
          <Sources
            onChange={(sources) => change({ sources })}
            sources={draft.sources}
          />
        </WorkspaceSection>

        <WorkspaceSection
          id="seo"
          note="puste pola biorą tytuł, wstęp i okładkę"
          title="Google i udostępnianie"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <TextField
                hint={`Puste: „${untitled(draft.title)}”. Bez nazwy centrum: „| Kolor Sensu” dopisze się sam.`}
                id="article-seo-title"
                label="Tytuł w Google"
                maxLength={ARTICLE_LIMITS_META.seoTitle}
                onChange={(seoTitle) => change({ seoTitle })}
                value={draft.seoTitle}
              />
              <TextField
                hint="Puste: wstęp."
                id="article-seo-description"
                label="Opis w Google"
                maxLength={ARTICLE_LIMITS_META.seoDescription}
                multiline
                onChange={(seoDescription) => change({ seoDescription })}
                value={draft.seoDescription}
              />
            </div>
            <SiteImageField
              decorative
              folder="articles"
              hint="Obrazek przy udostępnianiu linku, 1200 × 630. Pusty: okładka."
              id="article-og"
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

function Sources({
  sources,
  onChange,
}: {
  sources: readonly ArticleSource[];
  onChange: (sources: ArticleSource[]) => void;
}) {
  const set = (index: number, patch: Partial<ArticleSource>) =>
    onChange(
      sources.map((one, at) => (at === index ? { ...one, ...patch } : one)),
    );
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-[var(--text)]">
        Źródła (pod artykułem)
      </legend>
      {sources.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Brak źródeł.</p>
      ) : null}
      <ol className="grid gap-2">
        {sources.map((source, index) => (
          <li className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" key={index}>
            <input
              aria-label={`Źródło ${index + 1}: nazwa`}
              className={WORKSPACE_FIELD}
              maxLength={300}
              onChange={(event) => set(index, { title: event.target.value })}
              placeholder="Nazwa, np. WHO: Zaburzenia lękowe"
              value={source.title}
            />
            <input
              aria-label={`Źródło ${index + 1}: adres`}
              className={WORKSPACE_FIELD}
              inputMode="url"
              maxLength={2048}
              onChange={(event) => set(index, { url: event.target.value })}
              placeholder="https://…"
              value={source.url}
            />
            <button
              aria-label={`Usuń źródło ${index + 1}`}
              className={DETAIL_BUTTON}
              onClick={() => onChange(sources.filter((_, at) => at !== index))}
              type="button"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <button
        className={`${DETAIL_BUTTON} justify-self-start`}
        disabled={sources.length >= ARTICLE_LIMITS_META.sources}
        onClick={() => onChange([...sources, { title: "", url: "" }])}
        type="button"
      >
        <Plus aria-hidden="true" />
        Dodaj źródło
      </button>
    </fieldset>
  );
}
