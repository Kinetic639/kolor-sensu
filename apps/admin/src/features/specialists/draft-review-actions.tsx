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
  AlertDialogTrigger,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { useState, useTransition } from "react";
import { reviewSpecialistDraftAction } from "./actions";

// The draft's two ways out: approve (it replaces the published profile,
// after a confirmation) or reject with a comment the specialist will
// read. The page renders again with the outcome.

export function DraftReviewActions({
  specialistId,
  draftId,
}: {
  specialistId: string;
  draftId: string;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  const review = (action: "approve" | "reject") =>
    startTransition(async () => {
      const result = await reviewSpecialistDraftAction({
        specialistId,
        draftId,
        action,
        comment: action === "reject" ? comment.trim() : undefined,
      });
      if (!result.ok) {
        toast.error("Nie udało się zapisać decyzji", {
          description: result.message,
        });
        return;
      }
      setRejectOpen(false);
      setComment("");
      toast.success(
        action === "approve"
          ? "Profil został zatwierdzony"
          : "Szkic został odrzucony",
      );
    });

  return (
    <div className="flex flex-wrap justify-end gap-2 px-3.5 py-2.5">
      <Dialog onOpenChange={setRejectOpen} open={rejectOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">
            Odrzuć zmiany
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odrzuć szkic profilu</DialogTitle>
            <DialogDescription>
              Komentarz jest wymagany i będzie wskazówką dla specjalisty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-comment">Powód odrzucenia</Label>
            <Textarea
              aria-invalid={comment.length > 0 && !comment.trim()}
              id="rejection-comment"
              onChange={(event) => setComment(event.target.value)}
              value={comment}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setRejectOpen(false)} variant="secondary">
              Anuluj
            </Button>
            <Button
              disabled={!comment.trim()}
              loading={pending}
              onClick={() => review("reject")}
              variant="destructive"
            >
              Odrzuć szkic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button loading={pending} size="sm">
            Zatwierdź i opublikuj
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zatwierdzić profil?</AlertDialogTitle>
            <AlertDialogDescription>
              Proponowane dane zastąpią aktualny profil publiczny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => review("approve")}
            >
              Zatwierdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
