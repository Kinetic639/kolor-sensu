import { z } from "zod";

// Specialist availability (docs/product/booking-plan.md, "Reguły
// powtarzania"): one-offs, and rules on several weekdays every N weeks that
// end never, on a date or after N times, as calendar apps do. Times are the
// centre's local wall-clock time; the database checks overlaps and rooms.

export const availabilityModeSchema = z.enum(["in_person", "online", "hybrid"]);
export const availabilityRecurrenceSchema = z.enum(["once", "weekly"]);
export const recurrenceEndSchema = z.enum(["never", "until", "count"]);
/** Which occurrences of a rule a change applies to. */
export const occurrenceScopeSchema = z.enum(["this", "following", "all"]);

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
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1, "Wybierz co najmniej jeden dzień.")
      .max(7),
    intervalWeeks: z.number().int().min(1).max(4),
    startsAt: quarterHourSchema,
    endsAt: quarterHourSchema,
    validFrom: localDateSchema,
    ends: recurrenceEndSchema,
    validUntil: localDateSchema.nullable(),
    occurrenceCount: z.number().int().nullable(),
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
    if (value.recurrence === "once") return;
    if (value.ends === "until") {
      if (!value.validUntil) {
        context.addIssue({
          code: "custom",
          path: ["validUntil"],
          message: "Podaj datę końca.",
        });
      } else if (value.validUntil < value.validFrom) {
        context.addIssue({
          code: "custom",
          path: ["validUntil"],
          message: "Data końca nie może być przed datą początku.",
        });
      }
    }
    if (
      value.ends === "count" &&
      (!value.occurrenceCount ||
        value.occurrenceCount < 1 ||
        value.occurrenceCount > 200)
    ) {
      context.addIssue({
        code: "custom",
        path: ["occurrenceCount"],
        message: "Podaj liczbę powtórzeń od 1 do 200.",
      });
    }
  })
  .transform((value) => {
    const roomId = value.mode === "online" ? null : value.roomId;
    if (value.recurrence === "once") {
      return {
        ...value,
        roomId,
        weekdays: [isoWeekday(value.validFrom)],
        intervalWeeks: 1,
        ends: "never" as const,
        validUntil: value.validFrom,
        occurrenceCount: null,
      };
    }
    return {
      ...value,
      roomId,
      weekdays: [...new Set(value.weekdays)].sort((a, b) => a - b),
      validUntil: value.ends === "until" ? value.validUntil : null,
      occurrenceCount: value.ends === "count" ? value.occurrenceCount : null,
    };
  });

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
export type RecurrenceEnd = z.infer<typeof recurrenceEndSchema>;
export type OccurrenceScope = z.infer<typeof occurrenceScopeSchema>;
export type AvailabilityRuleInput = z.input<typeof availabilityRuleInputSchema>;
export type AvailabilityRuleValues = z.output<
  typeof availabilityRuleInputSchema
>;
export type TimeOffInput = z.infer<typeof timeOffInputSchema>;

export interface SpecialistAvailabilityRule {
  id: string;
  specialistId: string;
  recurrence: AvailabilityRecurrence;
  /** ISO weekdays, 1 Monday … 7 Sunday. */
  weekdays: number[];
  intervalWeeks: number;
  /** "after N times", for display; `validUntil` holds the last date. */
  occurrenceCount: number | null;
  /** Dates removed from the series. */
  exceptions: string[];
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
