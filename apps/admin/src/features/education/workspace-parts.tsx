"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { DetailBar } from "@repo/ui/detail-page";
import { Tag } from "@repo/ui/visit-table";
import { useSave, type ActionResult } from "@/lib/use-save";
import { useState, type ReactNode } from "react";
import { stateOf, type StateTag } from "./view-model";

// What an article's page and an e-book's page share: the bar with the
// title, its state and the actions (save the draft; publish, which saves
// first; withdraw and delete, each after a question), sections down the
// page with a heading, and an uploaded image's size.

export interface WorkspaceActions {
  dirty: boolean;
  pending: boolean;
  published: boolean;
  /** Published, with changes in the draft not on the site yet. */
  changed: boolean;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}

/**
 * A draft held in the page, and the bar's actions on it: save; publish
 * (saving first when there are unsaved changes); withdraw; delete.
 */
export function useDraftWorkspace<Draft>(
  initial: Draft,
  {
    published,
    hasUnpublishedChanges,
    save,
    publish,
    unpublish,
    remove,
  }: {
    published: boolean;
    hasUnpublishedChanges: boolean;
    save: (draft: Draft) => Promise<ActionResult>;
    publish: () => Promise<ActionResult>;
    unpublish: () => Promise<ActionResult>;
    remove: () => Promise<ActionResult>;
  },
) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const change = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const actions: WorkspaceActions = {
    dirty,
    pending: isPending,
    published,
    changed: hasUnpublishedChanges,
    onSave: () =>
      run(
        () => save(draft),
        "Zapisano szkic",
        () => setSaved(draft),
      ),
    onPublish: () =>
      run(
        async () => {
          if (!dirty) return publish();
          const result = await save(draft);
          return result.ok ? publish() : result;
        },
        "Opublikowano",
        () => setSaved(draft),
      ),
    onUnpublish: () => run(unpublish, "Wycofano ze strony"),
    onDelete: () => run(remove, "Usunięto"),
  };
  const state = stateOf({
    status: published ? "published" : "draft",
    hasUnpublishedChanges: hasUnpublishedChanges || dirty,
  });
  return { draft, change, actions, state };
}

export function WorkspaceBar({
  back,
  title,
  state,
  kind,
  actions,
}: {
  back: { href: string; label: string };
  title: string;
  state: StateTag;
  /** "artykuł" or "e-book", for the questions. */
  kind: string;
  actions: WorkspaceActions;
}) {
  const [asking, setAsking] = useState<"unpublish" | "delete" | null>(null);
  const { dirty, pending, published, changed } = actions;
  return (
    <>
      <DetailBar
        actions={
          <>
            {dirty ? (
              <span className="hidden text-[0.75rem] text-[var(--text-muted)] sm:inline">
                Niezapisane zmiany
              </span>
            ) : null}
            <Button
              className="h-7 px-2.5 text-[0.8125rem]"
              disabled={!dirty || pending}
              onClick={actions.onSave}
              size="sm"
              variant="secondary"
            >
              Zapisz szkic
            </Button>
            {!published || changed || dirty ? (
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={pending}
                loading={pending}
                onClick={actions.onPublish}
                size="sm"
              >
                {published ? "Opublikuj zmiany" : "Opublikuj"}
              </Button>
            ) : null}
            {published ? (
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={pending}
                onClick={() => setAsking("unpublish")}
                size="sm"
                variant="outline"
              >
                Wycofaj
              </Button>
            ) : (
              <Button
                className="h-7 px-2.5 text-[0.8125rem]"
                disabled={pending}
                onClick={() => setAsking("delete")}
                size="sm"
                variant="outline"
              >
                Usuń
              </Button>
            )}
          </>
        }
        back={back}
        tags={<Tag tone={state.tone}>{state.label}</Tag>}
        title={title}
      />
      <AlertDialog
        onOpenChange={(open) => setAsking(open ? asking : null)}
        open={asking !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {asking === "delete"
                ? `Usunąć ${kind}?`
                : `Wycofać ${kind} ze strony?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {asking === "delete"
                ? "Szkic zniknie na zawsze, razem z jego treścią."
                : "Zniknie ze strony, list i mapy strony; szkic zostanie, a jego adres przestanie działać do ponownej publikacji."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (asking === "delete") actions.onDelete();
                else actions.onUnpublish();
                setAsking(null);
              }}
            >
              {asking === "delete" ? "Usuń" : "Wycofaj"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** A section of the page: a heading (in the page's outline) and its fields. */
export function WorkspaceSection({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid gap-3 border-b border-[var(--border)] px-3.5 py-4"
      id={id}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2
          className="text-[0.9375rem] font-semibold text-[var(--text)]"
          id={`${id}-title`}
        >
          {title}
        </h2>
        {note ? (
          <span className="text-[0.75rem] text-[var(--text-muted)]">
            {note}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** The sections as links at the top, to jump down a long page. */
export function SectionLinks({
  sections,
}: {
  sections: readonly { id: string; label: string }[];
}) {
  return (
    <nav
      aria-label="Sekcje"
      className="flex h-[34px] shrink-0 items-stretch gap-4 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-3.5"
    >
      {sections.map((section) => (
        <a
          className="flex shrink-0 items-center text-[0.8125rem] whitespace-nowrap text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:text-[var(--text)] focus-visible:underline focus-visible:outline-none"
          href={`#${section.id}`}
          key={section.id}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

/** An image file's size, read in the browser before it is uploaded. */
export async function imageSize(
  file: File,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const FIELD =
  "w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]";

/** A labelled native select (few options; works with the keyboard as is). */
export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium text-[var(--text)]" htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={FIELD}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p className="text-xs text-[var(--text-muted)]" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Several of a list (services, specialists), as checkboxes. */
export function CheckList({
  legend,
  options,
  chosen,
  onChange,
  empty,
}: {
  legend: string;
  options: readonly { value: string; label: string }[];
  chosen: readonly string[];
  onChange: (chosen: string[]) => void;
  empty: string;
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-sm font-medium text-[var(--text)]">
        {legend}
      </legend>
      {options.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">{empty}</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {options.map((option) => (
            <label
              className="flex items-center gap-2 text-sm"
              key={option.value}
            >
              <input
                checked={chosen.includes(option.value)}
                className="size-4 accent-[var(--primary)]"
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...chosen, option.value]
                      : chosen.filter((one) => one !== option.value),
                  )
                }
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

export { FIELD as WORKSPACE_FIELD };
