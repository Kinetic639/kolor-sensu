"use client";

import { TextField } from "@/features/cms/text-field";
import { useSave } from "@/lib/use-save";
import {
  slugFromTitle,
  type ArticleCategory,
  type ArticleCategoryInput,
} from "@repo/contracts/education";
import { Button } from "@repo/ui/button";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCategoryAction, saveCategoryAction } from "./actions";

// Artykuły → Kategorie: the categories as a short list (a few, so all at
// once), each with its article count; "Edytuj" opens it in place, a new one
// is added under the list. A category with articles cannot be deleted (the
// database refuses it and says why).

const EMPTY: ArticleCategoryInput = {
  slug: "",
  name: "",
  description: "",
  sortOrder: 0,
};

export function CategoryManager({
  categories,
  counts,
}: {
  categories: readonly ArticleCategory[];
  /** Articles per category id. */
  counts: Readonly<Record<string, number>>;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(
    categories.length ? null : "new",
  );
  const nextOrder = Math.max(0, ...categories.map((one) => one.sortOrder)) + 10;

  return (
    <div className="grid max-w-3xl gap-3 px-3.5 py-4">
      {categories.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nie ma jeszcze kategorii. Artykuł musi mieć kategorię, żeby go
          opublikować.
        </p>
      ) : (
        <ul className="grid divide-y divide-[var(--border)] rounded-[var(--radius-control)] border border-[var(--border)]">
          {categories.map((category) =>
            editing === category.id ? (
              <li className="p-3" key={category.id}>
                <CategoryForm
                  id={category.id}
                  initial={category}
                  onDone={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                className="flex items-center gap-3 px-3 py-2"
                key={category.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-medium">{category.name}</p>
                  <p className="m-0 truncate text-xs text-[var(--text-muted)]">
                    /edukacja/artykuly/kategoria/{category.slug} ·{" "}
                    {articles(counts[category.id] ?? 0)}
                  </p>
                </div>
                <button
                  aria-label={`Edytuj kategorię ${category.name}`}
                  className={DETAIL_BUTTON}
                  onClick={() => setEditing(category.id)}
                  type="button"
                >
                  <Pencil aria-hidden="true" />
                </button>
                <DeleteCategory
                  category={category}
                  inUse={(counts[category.id] ?? 0) > 0}
                />
              </li>
            ),
          )}
        </ul>
      )}
      {editing === "new" ? (
        <section
          aria-labelledby="new-category-title"
          className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3"
        >
          <h2 className="text-sm font-semibold" id="new-category-title">
            Nowa kategoria
          </h2>
          <CategoryForm
            id={null}
            initial={{ ...EMPTY, sortOrder: nextOrder }}
            onDone={() => setEditing(null)}
          />
        </section>
      ) : (
        <Button
          className="justify-self-start"
          onClick={() => setEditing("new")}
          size="sm"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" />
          Dodaj kategorię
        </Button>
      )}
    </div>
  );
}

function articles(count: number): string {
  if (count === 0) return "bez artykułów";
  if (count === 1) return "1 artykuł";
  const tens = count % 100;
  const ones = count % 10;
  return ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)
    ? `${count} artykuły`
    : `${count} artykułów`;
}

function CategoryForm({
  id,
  initial,
  onDone,
}: {
  id: string | null;
  initial: ArticleCategoryInput;
  onDone: () => void;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState<ArticleCategoryInput>({
    slug: initial.slug,
    name: initial.name,
    description: initial.description,
    sortOrder: initial.sortOrder,
  });
  const prefix = id ?? "new";

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => saveCategoryAction(id, draft), "Zapisano kategorię", onDone);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id={`${prefix}-category-name`}
          label="Nazwa"
          maxLength={80}
          onChange={(name) =>
            setDraft((current) => ({
              ...current,
              name,
              // A new category's address follows its name.
              ...(id ? {} : { slug: slugFromTitle(name) }),
            }))
          }
          value={draft.name}
        />
        <TextField
          hint="Małe litery, cyfry i myślniki."
          id={`${prefix}-category-slug`}
          label="Adres: /edukacja/artykuly/kategoria/…"
          maxLength={120}
          onChange={(slug) =>
            setDraft((current) => ({ ...current, slug: slug.toLowerCase() }))
          }
          value={draft.slug}
        />
      </div>
      <TextField
        hint="Pod tytułem strony kategorii i w Google."
        id={`${prefix}-category-description`}
        label="Opis"
        maxLength={300}
        multiline
        onChange={(description) =>
          setDraft((current) => ({ ...current, description }))
        }
        rows={2}
        value={draft.description}
      />
      <div className="flex gap-2">
        <Button
          disabled={isPending}
          loading={isPending}
          size="sm"
          type="submit"
        >
          Zapisz
        </Button>
        <Button onClick={onDone} size="sm" type="button" variant="outline">
          Anuluj
        </Button>
      </div>
    </form>
  );
}

function DeleteCategory({
  category,
  inUse,
}: {
  category: ArticleCategory;
  inUse: boolean;
}) {
  const { isPending, run } = useSave();
  return (
    <button
      aria-label={`Usuń kategorię ${category.name}`}
      className={DETAIL_BUTTON}
      disabled={inUse || isPending}
      onClick={() =>
        run(() => deleteCategoryAction(category.id), "Usunięto kategorię")
      }
      title={inUse ? "Kategoria ma artykuły: najpierw je przenieś." : undefined}
      type="button"
    >
      <Trash2 aria-hidden="true" />
    </button>
  );
}
