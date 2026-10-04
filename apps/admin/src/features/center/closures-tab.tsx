"use client";

import { useSave } from "@/lib/use-save";
import { closureInputSchema } from "@repo/contracts/closures";
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
import { DETAIL_BUTTON, DetailSection, ROW_LINE } from "@repo/ui/detail-page";
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
import { Tag } from "@repo/ui/visit-table";
import { CalendarOff, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addHolidaysAction,
  deleteClosureAction,
  saveClosureAction,
  visitsOnDaysAction,
} from "./closure-actions";
import type { ClosureRow } from "./closures-view";

// Ustawienia → Dni zamknięcia: the days the whole centre is closed. No
// time is offered on them and no visit is booked or moved onto them;
// visits already booked there stay, and the list says how many to move.
// The year's public holidays are added with one click.

type Draft = { startsOn: string; endsOn: string; reason: string };

const visitsLabel = (count: number) =>
  count === 1
    ? "1 umówiona wizyta"
    : count % 10 >= 2 &&
        count % 10 <= 4 &&
        (count % 100 < 12 || count % 100 > 14)
      ? `${count} umówione wizyty`
      : `${count} umówionych wizyt`;

function ClosureForm({
  id,
  initial,
  onClose,
}: {
  id: string | null;
  initial: Draft;
  onClose: () => void;
}) {
  const { isPending, run } = useSave();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>(
    {},
  );
  const [visits, setVisits] = useState(0);
  const set = (key: keyof Draft) => (value: string) =>
    setDraft((was) => ({ ...was, [key]: value }));

  // The visits booked on the chosen days: they stay, so the admin knows.
  useEffect(() => {
    let current = true;
    if (draft.startsOn && draft.endsOn && draft.endsOn >= draft.startsOn) {
      visitsOnDaysAction(draft.startsOn, draft.endsOn).then(
        (count) => current && setVisits(count),
        () => current && setVisits(0),
      );
    } else setVisits(0);
    return () => {
      current = false;
    };
  }, [draft.startsOn, draft.endsOn]);

  const save = () => {
    const checked = closureInputSchema.safeParse(draft);
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
    run(
      () => saveClosureAction(id, checked.data),
      id ? "Zapisano dni zamknięcia" : "Dodano dni zamknięcia",
      onClose,
    );
  };

  const field = (key: keyof Draft, label: string, type = "text") => (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={`closure-${key}`}>{label}</Label>
      <Input
        aria-describedby={errors[key] ? `closure-${key}-error` : undefined}
        aria-invalid={errors[key] ? true : undefined}
        id={`closure-${key}`}
        maxLength={type === "text" ? 120 : undefined}
        onChange={(event) => set(key)(event.target.value)}
        placeholder={type === "text" ? "np. Przerwa świąteczna" : undefined}
        type={type}
        value={draft[key]}
      />
      {errors[key] ? (
        <p
          className="text-[0.75rem] text-[var(--danger)]"
          id={`closure-${key}-error`}
        >
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <Dialog onOpenChange={(open) => (open ? null : onClose())} open>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {id ? "Dni zamknięcia" : "Nowe dni zamknięcia"}
          </DialogTitle>
          <DialogDescription>
            W te dni klienci nie zobaczą wolnych terminów, a nikt nie umówi ani
            nie przesunie na nie wizyty.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("startsOn", "Od", "date")}
            {field("endsOn", "Do (włącznie)", "date")}
          </div>
          {field("reason", "Powód")}
          {visits ? (
            <p
              className="rounded-[6px] bg-[var(--warning-soft)] px-2.5 py-1.5 text-[0.75rem] text-[var(--warning-foreground)]"
              role="status"
            >
              W te dni jest {visitsLabel(visits)}. Zostaną, przełóż je lub
              odwołaj w Rezerwacjach.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Anuluj
          </Button>
          <Button loading={isPending} onClick={save} size="sm" type="button">
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveButton({ row }: { row: ClosureRow }) {
  const { isPending, run } = useSave();
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        destructive
        icon={<Trash2 aria-hidden="true" />}
        label={`Usuń dni zamknięcia ${row.dates}`}
        onClick={() => setOpen(true)}
      />
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć dni zamknięcia?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.dates} („{row.reason}”)
              {row.state === "past"
                ? "."
                : ": klienci znów zobaczą w te dni wolne terminy."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() =>
                run(
                  () => deleteClosureAction(row.id),
                  "Usunięto dni zamknięcia",
                )
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

function HolidaysButton({
  year,
  missing,
  today,
}: {
  year: number;
  missing: number;
  today: string;
}) {
  const { isPending, run } = useSave();
  return (
    <button
      className={DETAIL_BUTTON}
      disabled={isPending}
      onClick={() =>
        run(
          () => addHolidaysAction(year, today),
          `Dodano święta ${year}: ${missing}`,
        )
      }
      title={`Dodaj święta ustawowe ${year}, których jeszcze nie ma na liście`}
      type="button"
    >
      <Sparkles aria-hidden="true" />
      Święta {year} ({missing})
    </button>
  );
}

export function ClosuresTab({
  rows,
  today,
  holidays,
}: {
  rows: ClosureRow[];
  today: string;
  holidays: { year: number; missing: number }[];
}) {
  const [editing, setEditing] = useState<{
    id: string | null;
    initial: Draft;
    key: number;
  } | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)]">
      <DetailSection
        actions={
          <>
            {holidays
              .filter((one) => one.missing > 0)
              .map((one) => (
                <HolidaysButton key={one.year} today={today} {...one} />
              ))}
            <button
              className={DETAIL_BUTTON}
              onClick={() =>
                setEditing({
                  id: null,
                  initial: { startsOn: today, endsOn: today, reason: "" },
                  key: Date.now(),
                })
              }
              type="button"
            >
              <Plus aria-hidden="true" />
              Dodaj dni
            </button>
          </>
        }
        note="całe centrum: bez terminów i rezerwacji"
        title="Dni zamknięcia"
      >
        {rows.length ? (
          <ul>
            {rows.map((row) => (
              <li
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-2 last:border-b-0 ${ROW_LINE} ${row.state === "past" ? "opacity-60" : ""}`}
                key={row.id}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <Tag tone={row.tone}>{row.stateLabel}</Tag>
                  <span className="text-[0.8125rem] font-medium text-[var(--text)] tabular-nums">
                    {row.dates}
                  </span>
                  <span className="truncate text-[0.8125rem] text-[var(--text-muted)]">
                    {row.reason}
                    {row.days > 1 ? ` · ${row.days} dni` : ""}
                  </span>
                  {row.visits ? (
                    <Tag tone="warning">{visitsLabel(row.visits)}</Tag>
                  ) : null}
                </div>
                <div className="flex items-center gap-0.5">
                  <IconButton
                    icon={<Pencil aria-hidden="true" />}
                    label={`Edytuj dni zamknięcia ${row.dates}`}
                    onClick={() =>
                      setEditing({
                        id: row.id,
                        initial: {
                          startsOn: row.startsOn,
                          endsOn: row.endsOn,
                          reason: row.reason,
                        },
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
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <CalendarOff
              aria-hidden="true"
              className="size-5 text-[var(--text-muted)]"
            />
            <p className="text-[0.8125rem] text-[var(--text-muted)]">
              Dodaj święta albo przerwę zespołu, np. między świętami a Nowym
              Rokiem.
            </p>
          </div>
        )}
      </DetailSection>
      {editing ? (
        <ClosureForm
          id={editing.id}
          initial={editing.initial}
          key={editing.key}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
