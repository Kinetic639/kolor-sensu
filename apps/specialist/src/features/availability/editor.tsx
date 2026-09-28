"use client";

import type {
  AvailabilityRuleInput,
  AvailabilityRuleValues,
  RoomOccupancy,
  SpecialistAvailabilityRule,
} from "@repo/contracts";
import { useRefreshOnReturn } from "@repo/app-runtime/refresh-on-return";
import { describeRecurrence } from "@repo/scheduling";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import {
  RecurrenceScopeDialog,
  type RecurrenceScope,
} from "@repo/ui/recurrence";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/sheet";
import { Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  addTimeOffAction,
  deleteAvailabilityOccurrenceAction,
  deleteAvailabilityRuleAction,
  deleteTimeOffAction,
  editAvailabilityOccurrenceAction,
  saveAvailabilityRuleAction,
} from "./actions";
import {
  QuickCreateForm,
  RuleForm,
  TimeOffForm,
  type QuickCreateValues,
} from "./availability-forms";
import { ruleFormValues } from "./form-values";
import type { RoomViewModel } from "./types";
import { formatDate } from "./view-model";

// One place for the page's editing UI: the rule drawer, the quick form
// after a drag, time off, and the questions calendar apps ask about
// repeating events ("only this occurrence, this and following, or all?").

type Result = { ok: true } | { ok: false; message: string; stale?: boolean };

interface EditorApi {
  /**
   * Opens the drawer: a new window (`rule` null), a whole rule, or one
   * occurrence of it (`occurrenceDate`, from the calendar).
   */
  openRule: (
    rule: SpecialistAvailabilityRule | null,
    options?: {
      prefill?: Partial<AvailabilityRuleInput>;
      occurrenceDate?: string;
    },
  ) => void;
  openQuickCreate: (
    selection: QuickCreateValues & { dayLabel: string },
  ) => void;
  openTimeOff: () => void;
  /** Removes a window: asks about the scope for an occurrence of a rule. */
  confirmDeleteRule: (
    rule: SpecialistAvailabilityRule,
    label: string,
    occurrenceDate?: string,
  ) => void;
  confirmDeleteTimeOff: (id: string, label: string) => void;
  /** Runs a server action with a toast and refreshes the page. */
  run: (action: () => Promise<Result>, success: string) => void;
  pending: boolean;
}

const EditorContext = createContext<EditorApi | null>(null);

export function useAvailabilityEditor() {
  const editor = useContext(EditorContext);
  if (!editor) {
    throw new Error("useAvailabilityEditor needs AvailabilityEditorProvider");
  }
  return editor;
}

interface SheetState {
  rule: SpecialistAvailabilityRule | null;
  prefill: Partial<AvailabilityRuleInput>;
  occurrenceDate?: string;
  key: number;
}

type ScopeState =
  | {
      kind: "edit";
      rule: SpecialistAvailabilityRule;
      date: string;
      values: AvailabilityRuleValues;
    }
  | { kind: "delete"; rule: SpecialistAvailabilityRule; date: string };

type ConfirmState = {
  kind: "rule" | "time-off";
  id: string;
  label: string;
} | null;

const isOccurrenceOfRule = (
  rule: SpecialistAvailabilityRule | null,
  date: string | undefined,
): date is string => Boolean(rule && rule.recurrence === "weekly" && date);

export function AvailabilityEditorProvider({
  rooms,
  occupancy = [],
  today,
  specialistName,
  children,
}: {
  rooms: RoomViewModel[];
  /** Other specialists' hours in the shown week, to mark taken rooms. */
  occupancy?: RoomOccupancy[];
  today: string;
  specialistName: string;
  children: ReactNode;
}) {
  const router = useRouter();
  // Back on the tab after a while: others may have taken rooms since.
  useRefreshOnReturn(router.refresh);
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [quick, setQuick] = useState<
    (QuickCreateValues & { dayLabel: string }) | null
  >(null);
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [scope, setScope] = useState<ScopeState | null>(null);

  function closeAll() {
    setSheet(null);
    setQuick(null);
    setTimeOffOpen(false);
    setConfirm(null);
    setScope(null);
  }

  function run(action: () => Promise<Result>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        // Someone else changed the schedule: show it (e.g. who has the
        // room now), keeping the form open.
        if (result.stale) router.refresh();
        return;
      }
      closeAll();
      toast.success(success);
      router.refresh();
    });
  }

  function submitSheet(values: AvailabilityRuleValues) {
    if (!sheet) return;
    const { rule, occurrenceDate } = sheet;
    if (rule && isOccurrenceOfRule(rule, occurrenceDate)) {
      setScope({ kind: "edit", rule, date: occurrenceDate, values });
      return;
    }
    run(
      () => saveAvailabilityRuleAction(values, rule?.id),
      rule ? "Zapisano zmiany" : "Dodano dostępność",
    );
  }

  function applyScope(chosen: RecurrenceScope) {
    if (!scope) return;
    const target = { ruleId: scope.rule.id, date: scope.date, scope: chosen };
    if (scope.kind === "delete") {
      run(
        () => deleteAvailabilityOccurrenceAction(target),
        chosen === "this"
          ? "Usunięto ten termin"
          : chosen === "following"
            ? "Usunięto ten i następne terminy"
            : "Usunięto regułę",
      );
      return;
    }
    // "All": the series keeps its start unless the date itself was changed.
    const values =
      chosen === "all" && scope.values.validFrom === scope.date
        ? { ...scope.values, validFrom: scope.rule.validFrom }
        : scope.values;
    run(
      () => editAvailabilityOccurrenceAction(target, values),
      chosen === "this"
        ? "Zmieniono ten termin"
        : chosen === "following"
          ? "Zmieniono ten i następne terminy"
          : "Zmieniono wszystkie terminy",
    );
  }

  const api: EditorApi = {
    openRule: (rule, options = {}) =>
      setSheet({
        rule,
        prefill: options.prefill ?? {},
        occurrenceDate: options.occurrenceDate,
        key: Date.now(),
      }),
    openQuickCreate: setQuick,
    openTimeOff: () => setTimeOffOpen(true),
    confirmDeleteRule: (rule, label, occurrenceDate) => {
      setSheet(null);
      if (isOccurrenceOfRule(rule, occurrenceDate)) {
        setScope({ kind: "delete", rule, date: occurrenceDate });
      } else {
        setConfirm({ kind: "rule", id: rule.id, label });
      }
    },
    confirmDeleteTimeOff: (id, label) =>
      setConfirm({ kind: "time-off", id, label }),
    run,
    pending,
  };

  const occurrenceNotice =
    sheet && isOccurrenceOfRule(sheet.rule, sheet.occurrenceDate) ? (
      <p className="flex gap-2 rounded-[var(--radius-control)] border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] p-3 text-xs text-[var(--text)]">
        <Repeat
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--primary)]"
        />
        <span>
          Ten termin ({formatDate(sheet.occurrenceDate)}) jest częścią reguły „
          {describeRecurrence(sheet.rule!)}”. Przy zapisie wybierzesz, czy
          zmiana dotyczy tylko tego terminu, tego i następnych, czy wszystkich.
        </span>
      </p>
    ) : null;

  const scopeRuleText = scope
    ? `Ten termin (${formatDate(scope.date)}) jest częścią reguły „${describeRecurrence(scope.rule)}”.`
    : "";

  return (
    <EditorContext.Provider value={api}>
      {children}

      <Sheet
        onOpenChange={(open) => (open ? null : setSheet(null))}
        open={sheet !== null}
      >
        <SheetContent
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
          side="right"
        >
          <div
            aria-hidden="true"
            className="h-1.5 shrink-0 bg-[var(--primary)]"
          />
          <SheetHeader className="border-b border-[var(--border)] px-6 py-5 text-left">
            <p className="flex items-center gap-2 text-[0.6875rem]">
              <span className="rounded border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] px-2 py-0.5 font-semibold tracking-wider text-[var(--primary)] uppercase">
                Portal specjalisty
              </span>
              <span className="font-medium text-[var(--text-muted)]">
                {sheet?.rule ? "Edycja" : "Nowa dostępność"}
              </span>
            </p>
            <SheetTitle className="text-lg font-bold">
              {sheet?.rule
                ? sheet.rule.recurrence === "weekly"
                  ? sheet.occurrenceDate
                    ? "Edytuj termin z reguły"
                    : "Edytuj regułę dostępności"
                  : "Edytuj dostępność"
                : "Zdefiniuj okno przyjęć"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Specjalista:{" "}
              <strong className="text-[var(--text)]">{specialistName}</strong>
            </SheetDescription>
          </SheetHeader>
          {sheet ? (
            <RuleForm
              defaultValues={ruleFormValues(sheet.rule, {
                today,
                prefill: sheet.prefill,
                occurrenceDate: sheet.occurrenceDate,
              })}
              editing={sheet.rule !== null}
              key={sheet.key}
              notice={occurrenceNotice}
              onCancel={() => setSheet(null)}
              onDelete={
                sheet.rule
                  ? () =>
                      api.confirmDeleteRule(
                        sheet.rule!,
                        `${sheet.rule!.startsAt}–${sheet.rule!.endsAt}`,
                        sheet.occurrenceDate,
                      )
                  : undefined
              }
              onSubmit={submitSheet}
              occupancy={occupancy}
              pending={pending}
              rooms={rooms}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        onOpenChange={(open) => (open ? null : setQuick(null))}
        open={quick !== null}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Utwórz nową dostępność</DialogTitle>
            <DialogDescription>
              Zaznaczono przeciągnięciem na siatce.
            </DialogDescription>
          </DialogHeader>
          {quick ? (
            <QuickCreateForm
              dayLabel={quick.dayLabel}
              onCancel={() => setQuick(null)}
              onMoreOptions={(values) => {
                setQuick(null);
                setSheet({ rule: null, prefill: values, key: Date.now() });
              }}
              onSubmit={(values) =>
                run(
                  () => saveAvailabilityRuleAction(values),
                  "Dodano dostępność",
                )
              }
              occupancy={occupancy}
              pending={pending}
              rooms={rooms}
              selection={quick}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setTimeOffOpen} open={timeOffOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj nieobecność</DialogTitle>
            <DialogDescription>
              W tym czasie klienci nie zobaczą wolnych terminów. Umówione wizyty
              zostają.
            </DialogDescription>
          </DialogHeader>
          <TimeOffForm
            onCancel={() => setTimeOffOpen(false)}
            onSubmit={(values) =>
              run(() => addTimeOffAction(values), "Dodano nieobecność")
            }
            pending={pending}
            today={today}
          />
        </DialogContent>
      </Dialog>

      <RecurrenceScopeDialog
        confirmLabel={scope?.kind === "delete" ? "Usuń" : "Zapisz"}
        description={`${scopeRuleText} ${
          scope?.kind === "delete"
            ? "Których terminów dotyczy usunięcie? Umówione wizyty nie zostaną odwołane."
            : "Których terminów dotyczy zmiana?"
        }`}
        destructive={scope?.kind === "delete"}
        onCancel={() => setScope(null)}
        onConfirm={applyScope}
        open={scope !== null}
        pending={pending}
        title={
          scope?.kind === "delete"
            ? "Usunąć termin cykliczny?"
            : "Zmienić termin cykliczny?"
        }
      />

      <AlertDialog
        onOpenChange={(open) => (open ? null : setConfirm(null))}
        open={confirm !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "time-off"
                ? "Usunąć nieobecność?"
                : "Usunąć tę dostępność?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.label}. Umówione wizyty nie zostaną odwołane.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!confirm) return;
                const { id, kind } = confirm;
                run(
                  () =>
                    kind === "rule"
                      ? deleteAvailabilityRuleAction(id)
                      : deleteTimeOffAction(id),
                  kind === "rule"
                    ? "Usunięto dostępność"
                    : "Usunięto nieobecność",
                );
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EditorContext.Provider>
  );
}
