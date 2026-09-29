"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  availabilityRuleInputSchema,
  timeOffInputSchema,
  type AvailabilityRuleInput,
  type AvailabilityRuleValues,
  type RoomOccupancy,
  type TimeOffInput,
} from "@repo/contracts";
import {
  describeRecurrence,
  formatDayMonth,
  formatHours,
  isoWeekday,
  timeToMinutes,
} from "@repo/scheduling";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { ChoiceCardGroup } from "@repo/ui/choice-card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { WeekdayPicker } from "@repo/ui/recurrence";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Textarea } from "@repo/ui/textarea";
import {
  Building2,
  Check,
  Clock,
  Layers,
  Repeat,
  Trash2,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type Path,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { quickCreateDefaults, roomConflicts } from "./form-values";
import type { RoomViewModel } from "./types";

/** Quarter hours from 6:00 to 22:00. */
export const TIMES = Array.from({ length: 65 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const MODE_OPTIONS = [
  {
    value: "in_person" as const,
    label: "Stacjonarnie",
    icon: <Building2 className="size-4" />,
  },
  {
    value: "online" as const,
    label: "Online",
    icon: <Video className="size-4" />,
  },
  {
    value: "hybrid" as const,
    label: "Hybrydowo",
    icon: <Layers className="size-4" />,
  },
];

const INTERVALS = [
  ["1", "tydzień"],
  ["2", "2 tygodnie"],
  ["3", "3 tygodnie"],
  ["4", "4 tygodnie"],
] as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="text-sm text-[var(--danger)]" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-bold text-[var(--text)]">{title}</h3>
      {children}
    </section>
  );
}

function SmallLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <Label
      className="text-xs font-normal text-[var(--text-muted)]"
      htmlFor={htmlFor}
    >
      {children}
    </Label>
  );
}

function TimeSelect<Values extends Record<string, unknown>>({
  control,
  name,
  id,
  label,
  error,
}: {
  control: Control<Values>;
  name: Path<Values>;
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <div className="grid gap-1">
      <SmallLabel htmlFor={id}>{label}</SmallLabel>
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
              className="font-semibold tabular-nums"
              id={id}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMES.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** The rooms to choose from; one someone else has then is not available. */
function roomOptions(
  rooms: RoomViewModel[],
  conflicts: Map<string, RoomOccupancy> = new Map(),
) {
  return rooms.map((room) => {
    const taken = conflicts.get(room.id);
    return {
      value: room.id,
      label: room.name,
      accent: room.accent,
      disabled: Boolean(taken),
      description: taken
        ? `Zajęty: ${taken.specialistName}, ${formatDayMonth(taken.date)} ${taken.startsAt}–${taken.endsAt}`
        : undefined,
    };
  });
}

/** Rooms taken at the form's hours, as far as the shown week tells. */
function useRoomConflicts(
  watch: UseFormWatch<AvailabilityRuleInput>,
  occupancy: RoomOccupancy[],
) {
  const [recurrence, weekdays, intervalWeeks, validFrom, startsAt, endsAt] =
    watch([
      "recurrence",
      "weekdays",
      "intervalWeeks",
      "validFrom",
      "startsAt",
      "endsAt",
    ]);
  return roomConflicts(occupancy, {
    recurrence,
    weekdays,
    intervalWeeks,
    validFrom,
    startsAt,
    endsAt,
  });
}

type RuleForm = {
  control: Control<AvailabilityRuleInput>;
  watch: UseFormWatch<AvailabilityRuleInput>;
  setValue: UseFormSetValue<AvailabilityRuleInput>;
  errors: FieldErrors<AvailabilityRuleInput>;
};

/**
 * One-off (the default) or a rule: weekdays, every N weeks and how it ends,
 * with a plain summary — as calendar apps offer it.
 */
function RecurrenceFields({
  control,
  watch,
  setValue,
  errors,
  idPrefix,
}: RuleForm & { idPrefix: string }) {
  const [
    recurrence,
    weekdays,
    intervalWeeks,
    validFrom,
    ends,
    validUntil,
    occurrenceCount,
  ] = watch([
    "recurrence",
    "weekdays",
    "intervalWeeks",
    "validFrom",
    "ends",
    "validUntil",
    "occurrenceCount",
  ]);
  const summary =
    recurrence === "weekly"
      ? describeRecurrence({
          recurrence,
          weekdays,
          intervalWeeks,
          validFrom,
          validUntil: ends === "until" ? validUntil : null,
          occurrenceCount: ends === "count" ? occurrenceCount : null,
        })
      : null;

  return (
    <div className="grid gap-4">
      <Controller
        control={control}
        name="recurrence"
        render={({ field }) => (
          <ChoiceCardGroup
            legend="Powtarzanie"
            name={`${idPrefix}-recurrence`}
            onChange={(value) => {
              field.onChange(value);
              // A new rule repeats on the chosen day's weekday.
              if (value === "weekly" && weekdays.length <= 1) {
                setValue("weekdays", [isoWeekday(validFrom)]);
              }
            }}
            options={[
              {
                value: "once",
                label: "Jednorazowo",
                description: "Tylko w wybranym dniu",
              },
              {
                value: "weekly",
                label: "Reguła",
                description: "Powtarzaj w wybrane dni",
                icon: <Repeat className="size-4" />,
              },
            ]}
            value={field.value}
          />
        )}
      />

      {recurrence === "weekly" ? (
        <div className="grid gap-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <div className="grid gap-1.5">
            <p className="text-xs text-[var(--text-muted)]">Powtarzaj w</p>
            <Controller
              control={control}
              name="weekdays"
              render={({ field }) => (
                <WeekdayPicker
                  label="Powtarzaj w"
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            <FieldError
              id={`${idPrefix}-weekdays-error`}
              message={errors.weekdays?.message}
            />
          </div>

          <div className="grid gap-1 sm:w-1/2">
            <SmallLabel htmlFor={`${idPrefix}-interval`}>Co</SmallLabel>
            <Controller
              control={control}
              name="intervalWeeks"
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                >
                  <SelectTrigger id={`${idPrefix}-interval`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Controller
            control={control}
            name="ends"
            render={({ field }) => (
              <ChoiceCardGroup
                legend="Kończy się"
                name={`${idPrefix}-ends`}
                onChange={field.onChange}
                options={[
                  { value: "never", label: "Nigdy" },
                  { value: "until", label: "W dniu" },
                  { value: "count", label: "Po liczbie razy" },
                ]}
                value={field.value}
              />
            )}
          />
          {ends === "until" ? (
            <div className="grid gap-1 sm:w-1/2">
              <SmallLabel htmlFor={`${idPrefix}-until`}>
                Ostatni dzień
              </SmallLabel>
              <Controller
                control={control}
                name="validUntil"
                render={({ field }) => (
                  <Input
                    aria-describedby={
                      errors.validUntil ? `${idPrefix}-until-error` : undefined
                    }
                    id={`${idPrefix}-until`}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    type="date"
                    value={field.value ?? ""}
                  />
                )}
              />
              <FieldError
                id={`${idPrefix}-until-error`}
                message={errors.validUntil?.message}
              />
            </div>
          ) : null}
          {ends === "count" ? (
            <div className="grid gap-1 sm:w-1/2">
              <SmallLabel htmlFor={`${idPrefix}-count`}>
                Liczba powtórzeń
              </SmallLabel>
              <Controller
                control={control}
                name="occurrenceCount"
                render={({ field }) => (
                  <Input
                    aria-describedby={
                      errors.occurrenceCount
                        ? `${idPrefix}-count-error`
                        : undefined
                    }
                    id={`${idPrefix}-count`}
                    inputMode="numeric"
                    max={200}
                    min={1}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    type="number"
                    value={field.value ?? ""}
                  />
                )}
              />
              <FieldError
                id={`${idPrefix}-count-error`}
                message={errors.occurrenceCount?.message}
              />
            </div>
          ) : null}

          {summary ? (
            <p
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]"
              role="status"
            >
              <Repeat aria-hidden="true" className="size-3.5" />
              {summary}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function useRuleForm(defaultValues: AvailabilityRuleInput) {
  const form = useForm<AvailabilityRuleInput, unknown, AvailabilityRuleValues>({
    resolver: zodResolver(availabilityRuleInputSchema),
    defaultValues,
  });
  return form;
}

export function RuleForm({
  defaultValues,
  rooms,
  occupancy = [],
  pending,
  editing,
  notice,
  onCancel,
  onDelete,
  onSubmit,
}: {
  defaultValues: AvailabilityRuleInput;
  rooms: RoomViewModel[];
  /** Other specialists' hours in the shown week. */
  occupancy?: RoomOccupancy[];
  pending: boolean;
  editing: boolean;
  /** Shown above the fields, e.g. "this occurrence is part of a rule". */
  notice?: ReactNode;
  onCancel: () => void;
  onDelete?: () => void;
  onSubmit: (values: AvailabilityRuleValues) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useRuleForm(defaultValues);
  const [recurrence, mode, startsAt, endsAt] = watch([
    "recurrence",
    "mode",
    "startsAt",
    "endsAt",
  ]);
  const minutes = Math.max(0, timeToMinutes(endsAt) - timeToMinutes(startsAt));
  const conflicts = useRoomConflicts(watch, occupancy);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {notice}
        <Section title="1. Dzień i godziny">
          <div className="grid gap-1 sm:w-1/2">
            <SmallLabel htmlFor="rule-date">
              {recurrence === "once" ? "Dzień" : "Zaczyna się"}
            </SmallLabel>
            <Input
              aria-describedby={
                errors.validFrom ? "rule-date-error" : undefined
              }
              id="rule-date"
              type="date"
              {...register("validFrom")}
            />
            <FieldError
              id="rule-date-error"
              message={errors.validFrom?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimeSelect
              control={control}
              error={errors.startsAt?.message}
              id="rule-starts-at"
              label="Od"
              name="startsAt"
            />
            <TimeSelect
              control={control}
              error={errors.endsAt?.message}
              id="rule-ends-at"
              label="Do"
              name="endsAt"
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock
              aria-hidden="true"
              className="size-3.5 text-[var(--primary)]"
            />
            Łączny czas dyżuru:
            <strong className="text-[var(--text)]">
              {formatHours(minutes)}
            </strong>
          </p>
        </Section>

        <Section title="2. Powtarzanie">
          <RecurrenceFields
            control={control}
            errors={errors}
            idPrefix="rule"
            setValue={setValue}
            watch={watch}
          />
        </Section>

        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <ChoiceCardGroup
              legend="3. Forma pracy"
              name="rule-mode"
              onChange={field.onChange}
              options={MODE_OPTIONS}
              value={field.value}
            />
          )}
        />

        {mode === "online" ? null : (
          <Controller
            control={control}
            name="roomId"
            render={({ field }) => (
              <ChoiceCardGroup
                error={errors.roomId?.message}
                layout="list"
                legend="4. Przypisany gabinet"
                name="rule-room"
                onChange={field.onChange}
                options={roomOptions(rooms, conflicts)}
                value={field.value}
              />
            )}
          />
        )}

        <Section title={mode === "online" ? "4. Notatka" : "5. Notatka"}>
          <Label className="sr-only" htmlFor="rule-note">
            Notatka
          </Label>
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <Textarea
                aria-describedby="rule-note-hint"
                id="rule-note"
                onChange={(event) => field.onChange(event.target.value)}
                placeholder="np. pacjenci pierwszorazowi tylko do 15:00"
                rows={2}
                value={field.value ?? ""}
              />
            )}
          />
          <p className="text-xs text-[var(--text-muted)]" id="rule-note-hint">
            Widoczna tylko dla Ciebie i centrum.
          </p>
          <FieldError id="rule-note-error" message={errors.note?.message} />
        </Section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-6 py-4">
        {editing && onDelete ? (
          <Button
            className="text-[var(--danger)]"
            onClick={onDelete}
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Usuń
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button onClick={onCancel} variant="secondary">
            Anuluj
          </Button>
          <Button loading={pending} type="submit">
            <Check aria-hidden="true" className="size-4" />
            Zapisz dostępność
          </Button>
        </div>
      </div>
    </form>
  );
}

export interface QuickCreateValues {
  date: string;
  startsAt: string;
  endsAt: string;
  /** The room shown over the calendar, if any. */
  roomId?: string | null;
}

/** The short form after dragging on the calendar: this day, unless a rule. */
export function QuickCreateForm({
  selection,
  dayLabel,
  rooms,
  occupancy = [],
  pending,
  onCancel,
  onMoreOptions,
  onSubmit,
}: {
  selection: QuickCreateValues;
  dayLabel: string;
  rooms: RoomViewModel[];
  /** Other specialists' hours in the shown week. */
  occupancy?: RoomOccupancy[];
  pending: boolean;
  onCancel: () => void;
  onMoreOptions: (values: AvailabilityRuleInput) => void;
  onSubmit: (values: AvailabilityRuleValues) => void;
}) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useRuleForm(quickCreateDefaults(selection, rooms, occupancy));
  const mode = watch("mode");
  const conflicts = useRoomConflicts(watch, occupancy);
  const minutes =
    timeToMinutes(selection.endsAt) - timeToMinutes(selection.startsAt);

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] p-3">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Dzień i godziny</p>
          <p className="text-sm font-bold text-[var(--text)]">
            {dayLabel}, {selection.startsAt} – {selection.endsAt}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Wymiar</p>
          <p className="text-sm font-bold text-[var(--primary)]">
            {formatHours(minutes)}
          </p>
        </div>
      </div>

      <Controller
        control={control}
        name="mode"
        render={({ field }) => (
          <ChoiceCardGroup
            legend="Forma przyjęć"
            name="quick-mode"
            onChange={field.onChange}
            options={MODE_OPTIONS}
            value={field.value}
          />
        )}
      />

      {mode === "online" ? null : (
        <Controller
          control={control}
          name="roomId"
          render={({ field }) => (
            <ChoiceCardGroup
              error={errors.roomId?.message}
              legend="Przypisany gabinet"
              name="quick-room"
              onChange={field.onChange}
              options={roomOptions(rooms, conflicts)}
              value={field.value}
            />
          )}
        />
      )}

      <RecurrenceFields
        control={control}
        errors={errors}
        idPrefix="quick"
        setValue={setValue}
        watch={watch}
      />
      {errors.endsAt?.message ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {errors.endsAt.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <Button
          className="px-0 text-xs underline"
          onClick={() => onMoreOptions(getValues())}
          variant="ghost"
        >
          Więcej opcji…
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={onCancel} variant="secondary">
            Anuluj
          </Button>
          <Button loading={pending} type="submit">
            <Check aria-hidden="true" className="size-4" />
            Zapisz dostępność
          </Button>
        </div>
      </div>
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
    <form className="grid gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="off-from">Od dnia</Label>
          <Input id="off-from" type="date" {...register("fromDate")} />
          <FieldError id="off-from-error" message={errors.fromDate?.message} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="off-to">Do dnia</Label>
          <Input
            aria-describedby={errors.toDate ? "off-to-error" : undefined}
            id="off-to"
            type="date"
            {...register("toDate")}
          />
          <FieldError id="off-to-error" message={errors.toDate?.message} />
        </div>
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
        <div className="grid grid-cols-2 gap-3">
          <TimeSelect
            control={control}
            error={errors.fromTime?.message}
            id="off-from-time"
            label="Od godziny (pierwszego dnia)"
            name="fromTime"
          />
          <TimeSelect
            control={control}
            error={errors.toTime?.message}
            id="off-to-time"
            label="Do godziny (ostatniego dnia)"
            name="toTime"
          />
        </div>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="off-reason">Powód (opcjonalnie)</Label>
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
        <p className="text-xs text-[var(--text-muted)]" id="off-reason-hint">
          Widoczny tylko dla Ciebie i centrum.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
        <Button onClick={onCancel} variant="secondary">
          Anuluj
        </Button>
        <Button loading={pending} type="submit">
          Dodaj nieobecność
        </Button>
      </div>
    </form>
  );
}
