"use client";

import {
  outcomeLabel,
  tagLabel,
  VISIT_OUTCOMES,
  VISIT_TAGS,
  visitClosingSchema,
  type VisitClosing,
  type VisitClosingView,
  type VisitOutcome,
  type VisitTag,
} from "@repo/contracts/visit-closing";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "../button";
import { cn } from "../lib/utils";
import { Textarea } from "../textarea";
import { toast } from "../toast";
import { Tag } from "./visit-chips";

// A visit's closing in its panel: did it take place or did the client not
// come, a few tags about the visit itself and a short note for the centre
// (organisational: nothing about health). Closed, it says how, and can be
// changed. Seen by the visit's specialist and the admins.

export type CloseVisitAction = (
  visitId: string,
  closing: VisitClosing,
) => Promise<{ ok: true } | { ok: false; message: string }>;

function Closed({
  closing,
  onEdit,
}: {
  closing: VisitClosingView;
  onEdit: () => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag tone={closing.outcome === "attended" ? "success" : "danger"}>
          {outcomeLabel(closing.outcome)}
        </Tag>
        {closing.tags.map((tag) => (
          <Tag key={tag} tone="neutral">
            {tagLabel(tag)}
          </Tag>
        ))}
        <button
          className="ml-auto text-[0.75rem] font-medium text-[var(--primary)] hover:underline"
          onClick={onEdit}
          type="button"
        >
          Zmień
        </button>
      </div>
      {closing.note ? (
        <p className="text-[0.8125rem] break-words text-[var(--text)]">
          {closing.note}
        </p>
      ) : null}
      <p className="text-[0.6875rem] text-[var(--text-muted)]">
        Zamknięta
        {closing.closedByName ? ` przez: ${closing.closedByName}` : ""}
      </p>
    </div>
  );
}

export function VisitClosingForm({
  visitId,
  closing,
  action,
}: {
  visitId: string;
  /** How it was closed; null: not yet. */
  closing: VisitClosingView | null;
  action: CloseVisitAction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(closing === null);
  const [outcome, setOutcome] = useState<VisitOutcome | null>(
    closing?.outcome ?? null,
  );
  const [tags, setTags] = useState<VisitTag[]>(closing?.tags ?? []);
  const [note, setNote] = useState(closing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const checked = visitClosingSchema.safeParse({ outcome, tags, note });
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? "Sprawdź pola.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action(visitId, checked.data);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Zamknięto wizytę");
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <section
      aria-label="Zamknięcie wizyty"
      className={cn(
        "grid gap-2 border-b border-[var(--border)] px-3.5 py-3",
        !closing && "bg-[var(--warning-soft)]/40",
      )}
    >
      <h3 className="text-[0.75rem] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
        {closing ? "Zamknięcie wizyty" : "Zamknij wizytę"}
      </h3>
      {closing && !editing ? (
        <Closed closing={closing} onEdit={() => setEditing(true)} />
      ) : (
        <>
          <div
            aria-label="Czy wizyta się odbyła"
            className="grid grid-cols-2 gap-1.5"
            role="radiogroup"
          >
            {VISIT_OUTCOMES.map((one) => {
              const chosen = outcome === one.value;
              return (
                <button
                  aria-checked={chosen}
                  className={cn(
                    "h-8 rounded-[6px] border px-2 text-[0.8125rem] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                    chosen
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]",
                  )}
                  key={one.value}
                  onClick={() => setOutcome(one.value)}
                  role="radio"
                  type="button"
                >
                  {one.label}
                </button>
              );
            })}
          </div>
          <fieldset className="grid gap-1">
            <legend className="mb-1 text-[0.75rem] text-[var(--text-muted)]">
              Tagi (opcjonalnie)
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {VISIT_TAGS.map((one) => {
                const on = tags.includes(one.value);
                return (
                  <button
                    aria-pressed={on}
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-[0.75rem] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                      on
                        ? "border-[var(--text)] bg-[var(--text)] text-[var(--surface)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]",
                    )}
                    key={one.value}
                    onClick={() =>
                      setTags((was) =>
                        on
                          ? was.filter((tag) => tag !== one.value)
                          : [...was, one.value],
                      )
                    }
                    type="button"
                  >
                    {one.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-1">
            <label
              className="text-[0.75rem] text-[var(--text-muted)]"
              htmlFor={`closing-note-${visitId}`}
            >
              Notatka dla centrum (opcjonalnie)
            </label>
            <Textarea
              aria-describedby={`closing-note-hint-${visitId}`}
              className="min-h-16 text-[0.8125rem]"
              id={`closing-note-${visitId}`}
              maxLength={300}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              value={note}
            />
            <p
              className="text-[0.6875rem] text-[var(--text-muted)]"
              id={`closing-note-hint-${visitId}`}
            >
              Tylko sprawy organizacyjne, bez informacji o zdrowiu klienta.{" "}
              {note.length}/300
            </p>
          </div>
          {error ? (
            <p className="text-[0.75rem] text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            {closing ? (
              <Button
                onClick={() => setEditing(false)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Anuluj
              </Button>
            ) : null}
            <Button
              disabled={!outcome}
              loading={pending}
              onClick={save}
              size="sm"
              type="button"
            >
              Zamknij wizytę
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
