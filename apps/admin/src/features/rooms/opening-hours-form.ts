import type { RoomOpeningHoursIntervalInput } from "@repo/contracts";
import { z } from "zod";

// The room's week as a form: each day open or closed, with one or more
// intervals. Saved at once (replace_room_opening_hours).

const DEFAULT_INTERVAL = { startsAt: "08:00", endsAt: "18:00" };

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Podaj godzinę co 15 minut.");

const intervalSchema = z.object({ startsAt: timeSchema, endsAt: timeSchema });

const daySchema = z.object({
  weekday: z.number().int().min(1).max(7),
  open: z.boolean(),
  intervals: z.array(intervalSchema).min(1).max(6),
});

export const openingHoursFormSchema = z
  .object({ days: z.array(daySchema).length(7) })
  .superRefine((values, context) => {
    values.days.forEach((day, dayIndex) => {
      if (!day.open) return;
      day.intervals.forEach((interval, index) => {
        const path = ["days", dayIndex, "intervals", index];
        if (interval.endsAt <= interval.startsAt) {
          context.addIssue({
            code: "custom",
            path: [...path, "endsAt"],
            message: "Koniec musi być po początku.",
          });
          return;
        }
        const overlaps = day.intervals
          .slice(0, index)
          .some(
            (other) =>
              other.startsAt < interval.endsAt &&
              interval.startsAt < other.endsAt,
          );
        if (overlaps) {
          context.addIssue({
            code: "custom",
            path: [...path, "startsAt"],
            message: "Przedziały tego dnia nakładają się.",
          });
        }
      });
    });
  });

export type OpeningHoursFormValues = z.infer<typeof openingHoursFormSchema>;
export type OpeningHoursDay = OpeningHoursFormValues["days"][number];

export function toOpeningHoursFormValues(
  hours: RoomOpeningHoursIntervalInput[],
): OpeningHoursFormValues {
  return {
    days: Array.from({ length: 7 }, (_, index) => {
      const weekday = index + 1;
      const intervals = hours
        .filter((one) => one.weekday === weekday)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((one) => ({
          startsAt: one.startsAt.slice(0, 5),
          endsAt: one.endsAt.slice(0, 5),
        }));
      return {
        weekday,
        open: intervals.length > 0,
        intervals: intervals.length ? intervals : [{ ...DEFAULT_INTERVAL }],
      };
    }),
  };
}

export function toOpeningHoursIntervals(
  values: OpeningHoursFormValues,
): RoomOpeningHoursIntervalInput[] {
  return values.days.flatMap((day) =>
    day.open
      ? day.intervals.map((interval) => ({ weekday: day.weekday, ...interval }))
      : [],
  );
}

/** The days with `from`'s hours copied to each of `to`. */
export function copyDayTo(
  days: OpeningHoursDay[],
  from: number,
  to: number[],
): OpeningHoursDay[] {
  const source = days.find((day) => day.weekday === from);
  if (!source) return days;
  return days.map((day) =>
    to.includes(day.weekday)
      ? {
          weekday: day.weekday,
          open: source.open,
          intervals: source.intervals.map((one) => ({ ...one })),
        }
      : day,
  );
}

export { DEFAULT_INTERVAL };
