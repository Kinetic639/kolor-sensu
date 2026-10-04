"use client";

import { FileClock } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import { Label } from "../label";
import {
  ProfileReviewDiff,
  type ProfileReviewDiffField,
} from "../specialist-admin";
import { Textarea } from "../textarea";
import { toast } from "../toast";

// A profile draft waiting for review, on the specialist's page (R14): on
// the page one line (waiting since, how many changes) and a button; the
// changes against the published profile, and the decision, in a dialog,
// so the page keeps its layout. Approved, it replaces the published
// profile; rejected, with a reason the specialist will read.

export type DraftReviewAction = (
  action: "approve" | "reject",
  comment: string | undefined,
) => Promise<{ ok: true } | { ok: false; message: string }>;

/** `1 zmiana`, `3 zmiany`, `5 zmian`. */
function changesCount(count: number) {
  if (count === 1) return "1 zmiana";
  const last = count % 10;
  const lastTwo = count % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? `${count} zmiany`
    : `${count} zmian`;
}

export function DraftReview({
  name,
  submitted,
  fields,
  review,
}: {
  /** Whose profile. */
  name: string;
  /** `przesłano 4 października 2026` */
  submitted?: string;
  fields: ProfileReviewDiffField[];
  review: DraftReviewAction;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const changed = fields.filter((field) => field.changed).length;

  const decide = (action: "approve" | "reject") =>
    startTransition(async () => {
      const result = await review(
        action,
        action === "reject" ? comment.trim() : undefined,
      );
      if (!result.ok) {
        toast.error("Nie udało się zapisać decyzji", {
          description: result.message,
        });
        return;
      }
      toast.success(
        action === "approve"
          ? "Profil zatwierdzony i opublikowany"
          : "Szkic odrzucony",
      );
      setOpen(false);
      setRejecting(false);
      setComment("");
    });

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-[var(--border)] bg-[var(--warning-soft)] px-3.5 py-1.5"
    >
      <FileClock
        aria-hidden="true"
        className="size-4 shrink-0 text-[var(--warning-foreground)]"
      />
      <h2
        className="text-[0.8125rem] font-semibold text-[var(--warning-foreground)]"
        id={titleId}
      >
        Szkic czeka na weryfikację
      </h2>
      <span className="text-[0.75rem] text-[var(--warning-foreground)]/80">
        {[submitted, changed ? changesCount(changed) : "bez zmian w treści"]
          .filter(Boolean)
          .join(" · ")}
      </span>
      <Button
        className="ml-auto h-7 rounded-[5px] px-2.5 text-[0.75rem]"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
      >
        Przejrzyj zmiany
      </Button>
      <Dialog
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setRejecting(false);
        }}
        open={open}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-[var(--border)] px-5 py-4 pr-12">
            <DialogTitle className="text-base">
              Zmiany w profilu: {name}
            </DialogTitle>
            <DialogDescription>
              {rejecting
                ? "Napisz, co poprawić: specjalista zobaczy to w swoim portalu."
                : "Zatwierdzone zastąpią profil na stronie."}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-5 py-4">
            {rejecting ? (
              <div className="grid gap-2">
                <Label htmlFor={`${titleId}-reason`}>Powód odrzucenia</Label>
                <Textarea
                  autoFocus
                  id={`${titleId}-reason`}
                  onChange={(event) => setComment(event.target.value)}
                  rows={5}
                  value={comment}
                />
              </div>
            ) : (
              <ProfileReviewDiff fields={fields} />
            )}
          </div>
          <DialogFooter className="border-t border-[var(--border)] px-5 py-3">
            {rejecting ? (
              <>
                <Button
                  onClick={() => setRejecting(false)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Wróć do zmian
                </Button>
                <Button
                  disabled={!comment.trim()}
                  loading={pending}
                  onClick={() => decide("reject")}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  Odrzuć szkic
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setRejecting(true)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Odrzuć zmiany
                </Button>
                <Button
                  loading={pending}
                  onClick={() => decide("approve")}
                  size="sm"
                  type="button"
                >
                  Zatwierdź i opublikuj
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
