"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  availabilityRuleInputSchema,
  timeOffInputSchema,
  type AvailabilityRuleInput,
  type AvailabilityRuleValues,
  type SpecialistAvailabilityRule,
  type TimeOffInput,
} from "@repo/contracts";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { DialogFooter } from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Textarea } from "@repo/ui/textarea";
import type { ReactNode } from "react";
import { Controller, useForm, type Control, type Path } from "react-hook-form";

const WEEKDAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

const RECURRENCES = [
  ["weekly", "Co tydzień"],
  ["biweekly", "Co 2 tygodnie"],
  ["once", "Jednorazowo (jeden dzień)"],
] as const;

const MODES = [
  ["in_person", "W gabinecie"],
  ["online", "Online"],
  ["hybrid", "W gabinecie i online"],
] as const;

/** Quarter hours from 6:00 to 22:00. */
const TIMES = Array.from({ length: 65 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p className="text-xs text-[var(--text-muted)]" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function SelectField<Values extends Record<string, unknown>>({
  control,
  name,
  id,
  label,
  error,
  options,
  placeholder,
}: {
  control: Control<Values>;
  name: Path<Values>;
  id: string;
  label: string;
  error?: string;
  options: readonly (readonly [string, string])[];
  placeholder?: string;
}) {
  return (
    <Field error={error} id={id} label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            onValueChange={field.onChange}
            value={field.value == null ? undefined : String(field.value)}
          >
            <SelectTrigger
              aria-describedby={error ? `${id}-error` : undefined}
              aria-invalid={error ? true : undefined}
              id={id}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(([value, text]) => (
                <SelectItem key={value} value={value}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

export function toRuleFormValues(
  rule: SpecialistAvailabilityRule | null,
  defaults: { weekday?: number; recurrence?: "weekly" | "once"; today: string },
): AvailabilityRuleInput {
  if (rule) {
    return {
      recurrence: rule.recurrence,
      weekday: rule.weekday,
      startsAt: rule.startsAt,
      endsAt: rule.endsAt,
      validFrom: rule.validFrom,
      validUntil: rule.recurrence === "once" ? null : rule.validUntil,
      mode: rule.mode,
      roomId: rule.roomId,
      note: rule.note,
    };
  }
  return {
    recurrence: defaults.recurrence ?? "weekly",
    weekday: defaults.weekday ?? 1,
    startsAt: "09:00",
    endsAt: "13:00",
    validFrom: defaults.today,
    validUntil: null,
    mode: "in_person",
    roomId: null,
    note: null,
  };
}

export function RuleForm({
  defaultValues,
  rooms,
  pending,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  defaultValues: AvailabilityRuleInput;
  rooms: { id: string; name: string }[];
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: AvailabilityRuleValues) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AvailabilityRuleInput, unknown, AvailabilityRuleValues>({
    resolver: zodResolver(availabilityRuleInputSchema),
    defaultValues,
  });
  const recurrence = watch("recurrence");
  const mode = watch("mode");
  const once = recurrence === "once";

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <SelectField
        control={control}
        error={errors.recurrence?.message}
        id="rule-recurrence"
        label="Jak często"
        name="recurrence"
        options={RECURRENCES}
      />
      {once ? (
        <Field error={errors.validFrom?.message} id="rule-date" label="Dzień">
          <Input id="rule-date" type="date" {...register("validFrom")} />
        </Field>
      ) : (
        <>
          <Field
            error={errors.weekday?.message}
            id="rule-weekday"
            label="Dzień tygodnia"
          >
            <Controller
              control={control}
              name="weekday"
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                >
                  <SelectTrigger id="rule-weekday">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day, index) => (
                      <SelectItem key={day} value={String(index + 1)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={errors.validFrom?.message}
              hint={
                recurrence === "biweekly"
                  ? "Liczymy co drugi tydzień od tego tygodnia."
                  : undefined
              }
              id="rule-valid-from"
              label="Obowiązuje od"
            >
              <Input
                id="rule-valid-from"
                type="date"
                {...register("validFrom")}
              />
            </Field>
            <Field
              error={errors.validUntil?.message}
              id="rule-valid-until"
              label="Obowiązuje do (opcjonalnie)"
            >
              <Controller
                control={control}
                name="validUntil"
                render={({ field }) => (
                  <Input
                    id="rule-valid-until"
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    type="date"
                    value={field.value ?? ""}
                  />
                )}
              />
            </Field>
          </div>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          error={errors.startsAt?.message}
          id="rule-starts-at"
          label="Od"
          name="startsAt"
          options={TIMES.map((time) => [time, time] as const)}
        />
        <SelectField
          control={control}
          error={errors.endsAt?.message}
          id="rule-ends-at"
          label="Do"
          name="endsAt"
          options={TIMES.map((time) => [time, time] as const)}
        />
      </div>
      <SelectField
        control={control}
        error={errors.mode?.message}
        id="rule-mode"
        label="Forma"
        name="mode"
        options={MODES}
      />
      {mode === "online" ? null : (
        <SelectField
          control={control}
          error={errors.roomId?.message}
          id="rule-room"
          label="Gabinet"
          name="roomId"
          options={rooms.map((room) => [room.id, room.name] as const)}
          placeholder="Wybierz gabinet"
        />
      )}
      <Field
        error={errors.note?.message}
        hint="Widoczna tylko dla Ciebie i centrum."
        id="rule-note"
        label="Notatka (opcjonalnie)"
      >
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <Textarea
              aria-describedby="rule-note-hint"
              id="rule-note"
              onChange={(event) => field.onChange(event.target.value)}
              rows={2}
              value={field.value ?? ""}
            />
          )}
        />
      </Field>
      <DialogFooter>
        <Button onClick={onCancel} variant="secondary">
          Anuluj
        </Button>
        <Button loading={pending} type="submit">
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TimeOffForm({
  today,
  pending,
  onCancel,
  onSubmit,
}: {
  today: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: TimeOffInput) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TimeOffInput>({
    resolver: zodResolver(timeOffInputSchema),
    defaultValues: {
      fromDate: today,
      toDate: today,
      fromTime: null,
      toTime: null,
      reason: null,
    },
  });
  const partial = watch("fromTime") !== null;

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.fromDate?.message} id="off-from" label="Od dnia">
          <Input id="off-from" type="date" {...register("fromDate")} />
        </Field>
        <Field error={errors.toDate?.message} id="off-to" label="Do dnia">
          <Input id="off-to" type="date" {...register("toDate")} />
        </Field>
      </div>
      <div className="flex min-h-11 items-center gap-2">
        <Checkbox
          checked={!partial}
          id="off-whole-days"
          onCheckedChange={(checked) => {
            setValue("fromTime", checked ? null : "09:00");
            setValue("toTime", checked ? null : "17:00");
          }}
        />
        <Label className="font-normal" htmlFor="off-whole-days">
          Całe dni
        </Label>
      </div>
      {partial ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={control}
            error={errors.fromTime?.message}
            id="off-from-time"
            label="Od godziny (pierwszego dnia)"
            name="fromTime"
            options={TIMES.map((time) => [time, time] as const)}
          />
          <SelectField
            control={control}
            error={errors.toTime?.message}
            id="off-to-time"
            label="Do godziny (ostatniego dnia)"
            name="toTime"
            options={TIMES.map((time) => [time, time] as const)}
          />
        </div>
      ) : null}
      <Field
        error={errors.reason?.message}
        hint="Widoczny tylko dla Ciebie i centrum."
        id="off-reason"
        label="Powód (opcjonalnie)"
      >
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <Input
              aria-describedby="off-reason-hint"
              id="off-reason"
              onChange={(event) => field.onChange(event.target.value)}
              placeholder="np. Urlop, szkolenie"
              value={field.value ?? ""}
            />
          )}
        />
      </Field>
      <DialogFooter>
        <Button onClick={onCancel} variant="secondary">
          Anuluj
        </Button>
        <Button loading={pending} type="submit">
          Dodaj nieobecność
        </Button>
      </DialogFooter>
    </form>
  );
}
