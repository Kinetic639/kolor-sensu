import { z } from "zod";
import { announcementDates } from "./announcements";
import { localDateSchema } from "./availability";

// The days the whole centre is closed (Ustawienia → Dni zamknięcia): no
// time is offered on them and no visit is booked or moved onto them. The
// public holidays off work are offered to add with one click.

export const closureInputSchema = z
  .object({
    startsOn: localDateSchema,
    endsOn: localDateSchema,
    reason: z
      .string()
      .trim()
      .min(1, "Napisz, dlaczego centrum jest zamknięte.")
      .max(120, "Najwyżej 120 znaków."),
  })
  .refine((closure) => closure.endsOn >= closure.startsOn, {
    path: ["endsOn"],
    message: "Koniec nie może być przed początkiem.",
  });

export type ClosureInput = z.infer<typeof closureInputSchema>;

export interface Closure extends ClosureInput {
  id: string;
}

type Days = Pick<ClosureInput, "startsOn" | "endsOn">;

/** `11.11.2026`, `24.12–31.12.2026`. */
export const closureDates = (closure: Days) => announcementDates(closure);

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Easter Sunday (the Gregorian computus), as a UTC date. */
function easter(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const after = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86_400_000);

export interface Holiday {
  date: string;
  name: string;
}

/**
 * The public holidays off work in Poland that can fall on a weekday (Easter
 * and Pentecost are Sundays), in the year's order. Christmas Eve is one
 * since 2025.
 */
export function polishHolidays(year: number): Holiday[] {
  const sunday = easter(year);
  const fixed = (month: number, day: number, name: string) => ({
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    name,
  });
  return [
    fixed(1, 1, "Nowy Rok"),
    fixed(1, 6, "Trzech Króli"),
    { date: iso(after(sunday, 1)), name: "Poniedziałek Wielkanocny" },
    fixed(5, 1, "Święto Pracy"),
    fixed(5, 3, "Święto Konstytucji 3 Maja"),
    { date: iso(after(sunday, 60)), name: "Boże Ciało" },
    fixed(8, 15, "Wniebowzięcie NMP"),
    fixed(11, 1, "Wszystkich Świętych"),
    fixed(11, 11, "Święto Niepodległości"),
    ...(year >= 2025 ? [fixed(12, 24, "Wigilia")] : []),
    fixed(12, 25, "Boże Narodzenie"),
    fixed(12, 26, "Drugi dzień Bożego Narodzenia"),
  ].sort((one, other) => one.date.localeCompare(other.date));
}

/** The year's holidays from `today` on that no closure covers yet. */
export function missingHolidays(
  year: number,
  closures: readonly Days[],
  today: string,
) {
  return polishHolidays(year).filter(
    (holiday) =>
      holiday.date >= today &&
      !closures.some(
        (closure) =>
          closure.startsOn <= holiday.date && holiday.date <= closure.endsOn,
      ),
  );
}
