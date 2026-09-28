"use client";

import type { AvailabilityRuleValues, TimeOffInput } from "@repo/contracts";
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
import {
  AvailabilityWindowItem,
  TimeOffItem,
  WeeklySchedule,
} from "@repo/ui/availability";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { EmptyState, SectionHeader } from "@repo/ui/portal-content";
import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  addTimeOffAction,
  deleteAvailabilityRuleAction,
  deleteTimeOffAction,
  saveAvailabilityRuleAction,
} from "./actions";
import { RuleForm, TimeOffForm, toRuleFormValues } from "./availability-forms";
import type { AvailabilityViewModel, RuleViewModel } from "./types";

type DialogState =
  | { kind: "closed" }
  | {
      kind: "rule";
      rule: RuleViewModel | null;
      weekday?: number;
      recurrence?: "weekly" | "once";
    }
  | { kind: "time-off" }
  | { kind: "delete-rule"; rule: RuleViewModel; label: string }
  | { kind: "delete-time-off"; id: string; label: string };

type ActionResult = { ok: true } | { ok: false; message: string };

export function AvailabilityManager({
  model,
  today,
  preview,
}: {
  model: AvailabilityViewModel;
  /** Local date, the default for new windows and time off. */
  today: string;
  /** The server-rendered week preview. */
  preview: ReactNode;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [isPending, startTransition] = useTransition();
  const close = () => setDialog({ kind: "closed" });

  function run(action: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      close();
      toast.success(success);
      router.refresh();
    });
  }

  function windowActions(window: RuleViewModel, label: string) {
    return (
      <>
        <Button
          aria-label={`Edytuj: ${label}`}
          onClick={() => setDialog({ kind: "rule", rule: window })}
          size="icon"
          variant="ghost"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label={`Usuń: ${label}`}
          onClick={() =>
            setDialog({ kind: "delete-rule", rule: window, label })
          }
          size="icon"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </>
    );
  }

  const noRooms = model.rooms.length === 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionHeader
          action={
            <Button onClick={() => setDialog({ kind: "rule", rule: null })}>
              <Plus aria-hidden="true" className="size-4" />
              Dodaj godziny
            </Button>
          }
          description="Stałe godziny, w których przyjmujesz. Klienci mogą umówić wizytę tylko w tych godzinach."
          title="Grafik tygodniowy"
        />
        {noRooms ? (
          <p className="text-sm text-[var(--text-muted)]">
            Centrum nie ma jeszcze aktywnych gabinetów: na razie możesz dodać
            tylko godziny online.
          </p>
        ) : null}
        <WeeklySchedule
          days={model.weekly.map((day) => ({
            weekday: day.weekday,
            label: day.label,
            action: (
              <Button
                aria-label={`Dodaj godziny: ${day.label.toLowerCase()}`}
                onClick={() =>
                  setDialog({ kind: "rule", rule: null, weekday: day.weekday })
                }
                size="icon"
                variant="ghost"
              >
                <Plus aria-hidden="true" className="size-4" />
              </Button>
            ),
            windows: day.windows.map((window) => ({
              ...window,
              actions: windowActions(
                window,
                `${day.label.toLowerCase()} ${window.timeLabel}`,
              ),
            })),
          }))}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            action={
              <Button
                onClick={() =>
                  setDialog({ kind: "rule", rule: null, recurrence: "once" })
                }
                variant="secondary"
              >
                <CalendarPlus aria-hidden="true" className="size-4" />
                Dodaj dzień
              </Button>
            }
            description="Godziny tylko w wybranym dniu, poza stałym grafikiem."
            title="Dodatkowe godziny"
          />
          {model.oneOff.length ? (
            <ul className="mt-3">
              {model.oneOff.map((window) => (
                <AvailabilityWindowItem
                  key={window.id}
                  window={{
                    ...window,
                    recurrenceLabel: window.label,
                    actions: windowActions(
                      window,
                      `${window.label} ${window.timeLabel}`,
                    ),
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Brak dodatkowych godzin.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader
            action={
              <Button
                onClick={() => setDialog({ kind: "time-off" })}
                variant="secondary"
              >
                <Plus aria-hidden="true" className="size-4" />
                Dodaj nieobecność
              </Button>
            }
            description="Urlop, szkolenie albo zablokowane godziny. W tym czasie nie można się umówić."
            title="Nieobecności"
          />
          {model.timeOff.length ? (
            <ul className="mt-3">
              {model.timeOff.map((off) => (
                <TimeOffItem
                  actions={
                    <Button
                      aria-label={`Usuń nieobecność: ${off.label}`}
                      onClick={() =>
                        setDialog({
                          kind: "delete-time-off",
                          id: off.id,
                          label: off.label,
                        })
                      }
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  }
                  key={off.id}
                  label={off.label}
                  reason={off.reason}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Brak zaplanowanych nieobecności.
            </p>
          )}
        </Card>
      </div>

      {model.weekly.every((day) => day.windows.length === 0) &&
      model.oneOff.length === 0 ? (
        <EmptyState
          description="Dodaj godziny, w których przyjmujesz, a pojawią się w podglądzie tygodnia i w rezerwacjach."
          title="Nie masz jeszcze grafiku"
        />
      ) : (
        preview
      )}

      <Dialog
        onOpenChange={(open) => (open ? null : close())}
        open={dialog.kind === "rule" || dialog.kind === "time-off"}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          {dialog.kind === "rule" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialog.rule ? "Edytuj godziny" : "Dodaj godziny"}
                </DialogTitle>
                <DialogDescription>
                  Kiedy i gdzie przyjmujesz. Gabinet nie może być w tym czasie
                  zajęty przez inną osobę.
                </DialogDescription>
              </DialogHeader>
              <RuleForm
                defaultValues={toRuleFormValues(dialog.rule?.rule ?? null, {
                  weekday: dialog.weekday,
                  recurrence: dialog.recurrence,
                  today,
                })}
                key={
                  dialog.rule?.id ??
                  `new-${dialog.weekday}-${dialog.recurrence}`
                }
                onCancel={close}
                onSubmit={(values: AvailabilityRuleValues) =>
                  run(
                    () => saveAvailabilityRuleAction(values, dialog.rule?.id),
                    dialog.rule ? "Zapisano zmiany" : "Dodano godziny",
                  )
                }
                pending={isPending}
                rooms={model.rooms}
                submitLabel={dialog.rule ? "Zapisz zmiany" : "Dodaj godziny"}
              />
            </>
          ) : null}
          {dialog.kind === "time-off" ? (
            <>
              <DialogHeader>
                <DialogTitle>Dodaj nieobecność</DialogTitle>
                <DialogDescription>
                  W tym czasie klienci nie zobaczą wolnych terminów. Umówione
                  wizyty zostają.
                </DialogDescription>
              </DialogHeader>
              <TimeOffForm
                onCancel={close}
                onSubmit={(values: TimeOffInput) =>
                  run(() => addTimeOffAction(values), "Dodano nieobecność")
                }
                pending={isPending}
                today={today}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => (open ? null : close())}
        open={
          dialog.kind === "delete-rule" || dialog.kind === "delete-time-off"
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog.kind === "delete-time-off"
                ? "Usunąć nieobecność?"
                : "Usunąć te godziny?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.kind === "delete-rule" ||
              dialog.kind === "delete-time-off"
                ? `${dialog.label}. Umówione wizyty nie zostaną odwołane.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (dialog.kind === "delete-rule") {
                  const id = dialog.rule.id;
                  run(
                    () => deleteAvailabilityRuleAction(id),
                    "Usunięto godziny",
                  );
                }
                if (dialog.kind === "delete-time-off") {
                  const id = dialog.id;
                  run(() => deleteTimeOffAction(id), "Usunięto nieobecność");
                }
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
