import { z } from "zod";

// Specialist availability (docs/product/booking-plan.md, RD1). Times are the
// centre's local wall-clock time; the database checks overlaps and rooms.

export const availabilityModeSchema = z.enum(["in_person", "online", "hybrid"]);
export const availabilityRecurrenceSchema = z.enum([
  "weekly",
  "biweekly",
  "once",
]);

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isCalendarDate(value: string) {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** ISO weekday (1 Monday … 7 Sunday) of a `YYYY-MM-DD` date. */
function isoWeekday(value: string) {
  return ((new Date(`${value}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

export const localDateSchema = z
  .string()
  .refine(isCalendarDate, "Podaj poprawną datę.");

/** `HH:MM` on the quarter hour. */
export const quarterHourSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Wybierz pełny kwadrans.");

const optionalText = z
  .string()
  .trim()
  .max(500, "Najwyżej 500 znaków.")
  .nullable()
  .transform((value) => (value ? value : null));

export const availabilityRuleInputSchema = z
  .object({
    recurrence: availabilityRecurrenceSchema,
    weekday: z.number().int().min(1).max(7),
    startsAt: quarterHourSchema,
    endsAt: quarterHourSchema,
    validFrom: localDateSchema,
    validUntil: localDateSchema.nullable(),
    mode: availabilityModeSchema,
    roomId: z.uuid().nullable(),
    note: optionalText,
  })
  .superRefine((value, context) => {
    if (value.endsAt <= value.startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Koniec musi być po początku.",
      });
    }
    if (value.mode !== "online" && !value.roomId) {
      context.addIssue({
        code: "custom",
        path: ["roomId"],
        message: "Wybierz gabinet.",
      });
    }
    if (
      value.recurrence !== "once" &&
      value.validUntil &&
      value.validUntil < value.validFrom
    ) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "Data końca nie może być przed datą początku.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    roomId: value.mode === "online" ? null : value.roomId,
    ...(value.recurrence === "once"
      ? { weekday: isoWeekday(value.validFrom), validUntil: value.validFrom }
      : {}),
  }));

/**
 * Time off in local dates, whole days (no times) or from a time on the
 * first day to a time on the last.
 */
export const timeOffInputSchema = z
  .object({
    fromDate: localDateSchema,
    toDate: localDateSchema,
    fromTime: quarterHourSchema.nullable(),
    toTime: quarterHourSchema.nullable(),
    reason: optionalText,
  })
  .superRefine((value, context) => {
    if (value.toDate < value.fromDate) {
      context.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "Data końca nie może być przed datą początku.",
      });
      return;
    }
    if ((value.fromTime === null) !== (value.toTime === null)) {
      context.addIssue({
        code: "custom",
        path: [value.fromTime === null ? "fromTime" : "toTime"],
        message: "Podaj obie godziny albo żadnej.",
      });
      return;
    }
    if (
      value.fromTime &&
      value.toTime &&
      value.fromDate === value.toDate &&
      value.toTime <= value.fromTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["toTime"],
        message: "Koniec musi być po początku.",
      });
    }
  });

export type AvailabilityMode = z.infer<typeof availabilityModeSchema>;
export type AvailabilityRecurrence = z.infer<
  typeof availabilityRecurrenceSchema
>;
export type AvailabilityRuleInput = z.input<typeof availabilityRuleInputSchema>;
export type AvailabilityRuleValues = z.output<
  typeof availabilityRuleInputSchema
>;
export type TimeOffInput = z.infer<typeof timeOffInputSchema>;

export interface SpecialistAvailabilityRule {
  id: string;
  specialistId: string;
  recurrence: AvailabilityRecurrence;
  weekday: number;
  /** `HH:MM`, local. */
  startsAt: string;
  endsAt: string;
  validFrom: string;
  validUntil: string | null;
  mode: AvailabilityMode;
  roomId: string | null;
  note: string | null;
}

export interface SpecialistTimeOff {
  id: string;
  specialistId: string;
  /** ISO instants. */
  startsAt: string;
  endsAt: string;
  reason: string | null;
}
