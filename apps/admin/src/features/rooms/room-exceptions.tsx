"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { RoomAvailabilityException } from "@repo/contracts";
import { formatDate, formatWeekday } from "@repo/scheduling";
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
import { DetailSection, ROW_LINE } from "@repo/ui/detail-page";
import { ChoiceCardGroup } from "@repo/ui/choice-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Tag } from "@repo/ui/visit-table";
import { TimeSelect } from "@repo/ui/time-select";
import { CalendarOff, CalendarPlus, Clock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "@repo/ui/toast";
import { addRoomExceptionAction, deleteRoomExceptionAction } from "./actions";
import {
  EXCEPTION_TYPE_LABELS,
  exceptionFormDefaults,
  exceptionFormSchema,
  type ExceptionFormValues,
} from "./exception-form";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

const TYPE_ICONS = {
  closed_all_day: CalendarOff,
  blocked_interval: Clock,
  extra_available_interval: CalendarPlus,
};

function exceptionLabel(exception: RoomAvailabilityException) {
  const date = `${formatDate(exception.date)} (${formatWeekday(exception.date)})`;
  return exception.startsAt && exception.endsAt
    ? `${date}, ${exception.startsAt}–${exception.endsAt}`
    : date;
}

function AddExceptionButton({
  roomId,
  today,
  step,
}: {
  roomId: string;
  today: string;
  /** The centre's grid: blocked time lies on it (minutes). */
  step: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExceptionFormValues>({
    resolver: zodResolver(exceptionFormSchema),
    defaultValues: exceptionFormDefaults(today),
  });
  const timed = watch("type") !== "closed_all_day";

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await addRoomExceptionAction(roomId, values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Dodano wyjątek");
      setOpen(false);
      reset(exceptionFormDefaults(today));
      router.refresh();
    }),
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="h-[26px] px-2.5 text-[0.75rem]"
          size="sm"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Dodaj wyjątek
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowy wyjątek</DialogTitle>
          <DialogDescription>
            Dzień, w którym gabinet działa inaczej niż zwykle: jest zamknięty,
            ma zablokowane godziny albo dodatkowo otwarte.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="exception-date">Data</Label>
            <Input
              aria-describedby="exception-date-error"
              aria-invalid={errors.date ? true : undefined}
              id="exception-date"
              min={today}
              type="date"
              {...register("date")}
            />
            <FieldError
              id="exception-date-error"
              message={errors.date?.message}
            />
          </div>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <ChoiceCardGroup
                legend="Rodzaj"
                name="exception-type"
                onChange={field.onChange}
                options={(
                  Object.keys(EXCEPTION_TYPE_LABELS) as Array<
                    keyof typeof EXCEPTION_TYPE_LABELS
                  >
                ).map((type) => {
                  const Icon = TYPE_ICONS[type];
                  return {
                    value: type,
                    label: EXCEPTION_TYPE_LABELS[type],
                    icon: <Icon className="size-4" />,
                  };
                })}
                value={field.value}
              />
            )}
          />
          {timed ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exception-from">Od</Label>
                <Controller
                  control={control}
                  name="startsAt"
                  render={({ field }) => (
                    <TimeSelect
                      className="w-full"
                      id="exception-from"
                      onChange={field.onChange}
                      step={step}
                      value={field.value}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exception-to">Do</Label>
                <Controller
                  control={control}
                  name="endsAt"
                  render={({ field }) => (
                    <TimeSelect
                      aria-describedby="exception-to-error"
                      aria-invalid={errors.endsAt ? true : undefined}
                      className="w-full"
                      id="exception-to"
                      onChange={field.onChange}
                      step={step}
                      value={field.value}
                    />
                  )}
                />
              </div>
              <div className="col-span-2">
                <FieldError
                  id="exception-to-error"
                  message={errors.endsAt?.message ?? errors.startsAt?.message}
                />
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="exception-reason">Powód (opcjonalnie)</Label>
            <Input
              id="exception-reason"
              placeholder="np. Remont, serwis klimatyzacji"
              {...register("reason")}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="secondary"
            >
              Anuluj
            </Button>
            <Button loading={isPending} type="submit">
              Dodaj wyjątek
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteExceptionButton({
  roomId,
  exception,
}: {
  roomId: string;
  exception: RoomAvailabilityException;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = exceptionLabel(exception);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={`Usuń wyjątek: ${label}`}
          disabled={isPending}
          size="icon"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć wyjątek?</AlertDialogTitle>
          <AlertDialogDescription>
            {EXCEPTION_TYPE_LABELS[exception.type]}: {label}. Tego dnia gabinet
            wróci do zwykłych godzin otwarcia.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await deleteRoomExceptionAction(
                  roomId,
                  exception.id,
                );
                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }
                toast.success("Usunięto wyjątek");
                router.refresh();
              })
            }
          >
            Usuń
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Gabinety → Godziny otwarcia: dates the room differs from its week. */
export function RoomExceptions({
  roomId,
  today,
  step,
  exceptions,
}: {
  roomId: string;
  today: string;
  exceptions: RoomAvailabilityException[];
  /** The centre's grid: blocked time lies on it (minutes). */
  step: number;
}) {
  return (
    <DetailSection
      actions={<AddExceptionButton roomId={roomId} step={step} today={today} />}
      title="Wyjątki"
    >
      {exceptions.length ? (
        <ul>
          {exceptions.map((exception) => {
            const Icon = TYPE_ICONS[exception.type];
            return (
              <li
                className={`flex items-center gap-3 border-b px-3.5 py-2 last:border-b-0 ${ROW_LINE}`}
                key={exception.id}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[var(--text-muted)]"
                />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text)]">
                    {exceptionLabel(exception)}
                  </p>
                  {exception.reason ? (
                    <p className="truncate text-[0.75rem] text-[var(--text-muted)]">
                      {exception.reason}
                    </p>
                  ) : null}
                </div>
                <Tag
                  tone={
                    exception.type === "extra_available_interval"
                      ? "success"
                      : "warning"
                  }
                >
                  {EXCEPTION_TYPE_LABELS[exception.type]}
                </Tag>
                <DeleteExceptionButton exception={exception} roomId={roomId} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-3.5 py-3 text-[0.8125rem] text-[var(--text-muted)]">
          Brak zaplanowanych wyjątków. Święta, remonty, dodatkowe dni dodasz
          tutaj; widać je w grafiku gabinetu.
        </p>
      )}
    </DetailSection>
  );
}
