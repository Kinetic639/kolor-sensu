"use client";

import { announcementInputSchema } from "@repo/contracts/announcements";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { IconButton } from "@repo/ui/icon-action";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { Tag } from "@repo/ui/visit-table";
import { ArrowRight, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAnnouncementAction, saveAnnouncementAction } from "./actions";
import type { AnnouncementRow } from "./view-model";

// The announcements (the admin's CMS): the one on the site now as it looks
// there, then every one in a list (its state, words, days, link), each
// edited in a dialog or removed after a question. New ones from the bar.

type Draft = {
  message: string;
  linkLabel: string;
  linkHref: string;
  startsOn: string;
  endsOn: string;
};

const blank = (today: string): Draft => ({
  message: "",
  linkLabel: "",
  linkHref: "",
  startsOn: today,
  endsOn: today,
});

const draftOf = (row: AnnouncementRow): Draft => ({
  message: row.message,
  linkLabel: row.linkLabel ?? "",
  linkHref: row.linkHref ?? "",
  startsOn: row.startsOn,
  endsOn: row.endsOn,
});

/** The bar as the site shows it (its colours, its link). */
function BarPreview({ row }: { row: AnnouncementRow }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 rounded-[6px] bg-[#45684a] px-3 py-2 text-center text-[0.8125rem] text-white">
      <span>{row.message}</span>
      {row.linkLabel ? (
        <span className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
          {row.linkLabel}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </span>
      ) : null}
    </div>
  );
}

function AnnouncementForm({
  open,
  onOpenChange,
  id,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
  initial: Draft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>(
    {},
  );
  const [pending, startTransition] = useTransition();
  const set = (key: keyof Draft) => (value: string) =>
    setDraft((was) => ({ ...was, [key]: value }));

  const save = () => {
    const checked = announcementInputSchema.safeParse(draft);
    if (!checked.success) {
      setErrors(
        Object.fromEntries(
          checked.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await saveAnnouncementAction(id, draft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(id ? "Zapisano ogłoszenie" : "Dodano ogłoszenie");
      onOpenChange(false);
      router.refresh();
    });
  };

  const field = (key: keyof Draft) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `announcement-${key}-error` : undefined,
    id: `announcement-${key}`,
    value: draft[key],
  });
  const error = (key: keyof Draft) =>
    errors[key] ? (
      <p
        className="text-[0.75rem] text-[var(--danger)]"
        id={`announcement-${key}-error`}
      >
        {errors[key]}
      </p>
    ) : null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{id ? "Ogłoszenie" : "Nowe ogłoszenie"}</DialogTitle>
          <DialogDescription>
            Wąska belka nad nagłówkiem każdej strony, w wybrane dni.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="announcement-message">Treść</Label>
            <Textarea
              {...field("message")}
              maxLength={200}
              onChange={(event) => set("message")(event.target.value)}
              rows={3}
            />
            <p className="flex justify-between gap-2 text-[0.75rem] text-[var(--text-muted)]">
              <span>Krótko: najwyżej 200 znaków.</span>
              <span className="tabular-nums">{draft.message.length}/200</span>
            </p>
            {error("message")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="announcement-startsOn">Od</Label>
              <Input
                {...field("startsOn")}
                onChange={(event) => set("startsOn")(event.target.value)}
                type="date"
              />
              {error("startsOn")}
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="announcement-endsOn">Do (włącznie)</Label>
              <Input
                {...field("endsOn")}
                onChange={(event) => set("endsOn")(event.target.value)}
                type="date"
              />
              {error("endsOn")}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="announcement-linkLabel">
                Tekst linku (opcjonalnie)
              </Label>
              <Input
                {...field("linkLabel")}
                maxLength={40}
                onChange={(event) => set("linkLabel")(event.target.value)}
                placeholder="np. Szczegóły"
              />
              {error("linkLabel")}
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="announcement-linkHref">Adres linku</Label>
              <Input
                {...field("linkHref")}
                onChange={(event) => set("linkHref")(event.target.value)}
                placeholder="/kontakt"
              />
              {error("linkHref")}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Anuluj
          </Button>
          <Button loading={pending} onClick={save} size="sm" type="button">
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveButton({ row }: { row: AnnouncementRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <IconButton
        destructive
        icon={<Trash2 aria-hidden="true" />}
        label={`Usuń ogłoszenie ${row.dates}`}
        onClick={() => setOpen(true)}
      />
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć ogłoszenie?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.state === "current"
                ? "Zniknie ze strony od razu."
                : "Nie pojawi się na stronie."}{" "}
              „{row.message}”
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteAnnouncementAction(row.id);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Usunięto ogłoszenie");
                  router.refresh();
                })
              }
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AnnouncementsManager({
  rows,
  today,
}: {
  rows: AnnouncementRow[];
  today: string;
}) {
  const [editing, setEditing] = useState<{
    id: string | null;
    initial: Draft;
    key: number;
  } | null>(null);
  const current = rows.find((row) => row.state === "current");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3">
        <span className="text-[0.8125rem] text-[var(--text-muted)]">
          {rows.length ? `Ogłoszenia: ${rows.length}` : "Brak ogłoszeń"}
        </span>
        <Button
          className="ml-auto h-7 rounded-[5px] px-2.5 text-[0.75rem]"
          onClick={() =>
            setEditing({ id: null, initial: blank(today), key: Date.now() })
          }
          size="sm"
          type="button"
        >
          <Plus aria-hidden="true" />
          Nowe ogłoszenie
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[var(--surface-subtle)] p-2 sm:gap-3 sm:p-3 [&>*]:shrink-0">
        <section
          aria-label="Na stronie teraz"
          className="grid gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <h2 className="text-[0.8125rem] font-semibold">Na stronie teraz</h2>
          {current ? (
            <BarPreview row={current} />
          ) : (
            <p className="text-[0.8125rem] text-[var(--text-muted)]">
              Dziś żadne ogłoszenie nie jest wyświetlane.
            </p>
          )}
        </section>

        {rows.length ? (
          <ul
            aria-label="Ogłoszenia"
            className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)]"
          >
            {rows.map((row) => (
              <li
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 last:border-b-0"
                key={row.id}
              >
                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={row.tone}>{row.stateLabel}</Tag>
                    <span className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
                      {row.dates}
                    </span>
                  </div>
                  <p className="text-[0.8125rem] break-words text-[var(--text)]">
                    {row.message}
                  </p>
                  {row.linkLabel ? (
                    <p className="text-[0.75rem] text-[var(--text-muted)]">
                      Link: {row.linkLabel} → {row.linkHref}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-0.5">
                  <IconButton
                    icon={<Pencil aria-hidden="true" />}
                    label={`Edytuj ogłoszenie ${row.dates}`}
                    onClick={() =>
                      setEditing({
                        id: row.id,
                        initial: draftOf(row),
                        key: Date.now(),
                      })
                    }
                  />
                  <RemoveButton row={row} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid justify-items-center gap-2 rounded-[8px] border border-dashed border-[var(--border)] px-4 py-10 text-center">
            <Megaphone
              aria-hidden="true"
              className="size-5 text-[var(--text-muted)]"
            />
            <p className="text-[0.8125rem] text-[var(--text-muted)]">
              Dodaj pierwsze ogłoszenie, np. o świątecznej przerwie.
            </p>
          </div>
        )}
      </div>

      {editing ? (
        <AnnouncementForm
          id={editing.id}
          initial={editing.initial}
          key={editing.key}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          open
        />
      ) : null}
    </div>
  );
}
