import type { RoomAvailabilityExceptionCreate } from "@repo/contracts";
import { z } from "zod";

// One date the room differs from its week: closed all day, some hours
// blocked, or extra hours open.

export const EXCEPTION_TYPES = [
  "closed_all_day",
  "blocked_interval",
  "extra_available_interval",
] as const;

export const EXCEPTION_TYPE_LABELS: Record<
  (typeof EXCEPTION_TYPES)[number],
  string
> = {
  closed_all_day: "Zamknięty cały dzień",
  blocked_interval: "Zablokowane godziny",
  extra_available_interval: "Dodatkowo otwarty",
};

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Podaj godzinę co 15 minut.");

export const exceptionFormSchema = z
  .object({
    date: z.iso.date("Wybierz datę."),
    type: z.enum(EXCEPTION_TYPES),
    startsAt: timeSchema,
    endsAt: timeSchema,
    reason: z.string().trim().max(500, "Najwyżej 500 znaków."),
  })
  .refine(
    (values) =>
      values.type === "closed_all_day" || values.startsAt < values.endsAt,
    { path: ["endsAt"], message: "Koniec musi być po początku." },
  );

export type ExceptionFormValues = z.infer<typeof exceptionFormSchema>;

export function exceptionFormDefaults(date: string): ExceptionFormValues {
  return {
    date,
    type: "closed_all_day",
    startsAt: "08:00",
    endsAt: "12:00",
    reason: "",
  };
}

export function toRoomExceptionInput(
  roomId: string,
  values: ExceptionFormValues,
): RoomAvailabilityExceptionCreate {
  const reason = values.reason.trim() || null;
  return values.type === "closed_all_day"
    ? {
        roomId,
        date: values.date,
        type: values.type,
        startsAt: null,
        endsAt: null,
        reason,
      }
    : {
        roomId,
        date: values.date,
        type: values.type,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        reason,
      };
}
