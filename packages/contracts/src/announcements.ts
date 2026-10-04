import { z } from "zod";

// Announcements on the site (the admin's CMS): a narrow bar above the
// header, shown from one day to another (both included, in the centre's
// time), optionally with a link.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Blank text is none. */
const optional = (schema: z.ZodString) =>
  z
    .string()
    .nullable()
    .transform((value) => (value && value.trim() ? value.trim() : null))
    .pipe(schema.nullable());

export const announcementInputSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Wpisz treść ogłoszenia.")
      .max(200, "Najwyżej 200 znaków: to wąska belka."),
    linkLabel: optional(z.string().max(40, "Najwyżej 40 znaków.")),
    linkHref: optional(
      z
        .string()
        .regex(
          /^(\/[^/]|\/$|https:\/\/)/,
          "Adres strony na witrynie (/kontakt) albo pełny (https://…).",
        ),
    ),
    startsOn: z.string().regex(DATE, "Wybierz datę."),
    endsOn: z.string().regex(DATE, "Wybierz datę."),
  })
  .superRefine((value, context) => {
    if (value.endsOn < value.startsOn) {
      context.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "Koniec nie może być przed początkiem.",
      });
    }
    if ((value.linkLabel === null) !== (value.linkHref === null)) {
      context.addIssue({
        code: "custom",
        path: [value.linkLabel === null ? "linkLabel" : "linkHref"],
        message: "Link potrzebuje i tekstu, i adresu.",
      });
    }
  });

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

export interface Announcement extends AnnouncementInput {
  id: string;
}

type Dates = Pick<AnnouncementInput, "startsOn" | "endsOn">;

/** Before its days, on them, or after (dates as `YYYY-MM-DD`). */
export function announcementState(dates: Dates, today: string) {
  if (today < dates.startsOn) return "scheduled" as const;
  if (today > dates.endsOn) return "past" as const;
  return "current" as const;
}

const day = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`;

/** `10.12–23.12.2026`, `24.12.2026`, `28.12.2026–03.01.2027`. */
export function announcementDates({ startsOn, endsOn }: Dates) {
  const endYear = endsOn.slice(0, 4);
  if (startsOn === endsOn) return `${day(endsOn)}.${endYear}`;
  return startsOn.slice(0, 4) === endYear
    ? `${day(startsOn)}–${day(endsOn)}.${endYear}`
    : `${day(startsOn)}.${startsOn.slice(0, 4)}–${day(endsOn)}.${endYear}`;
}
