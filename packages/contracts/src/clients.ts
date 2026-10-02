import { z } from "zod";

// Correcting a client's details and the centre's note
// (docs/product/booking-plan.md, R15): what the admin portal checks before
// the database checks it again.

const optional = (schema: z.ZodString) =>
  schema.nullish().transform((value) => value || null);

export const clientDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Podaj imię i nazwisko.")
    .max(200, "Imię i nazwisko może mieć najwyżej 200 znaków."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, "Adres e-mail jest za długi.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Podaj poprawny adres e-mail."),
  phone: optional(
    z
      .string()
      .trim()
      .refine(
        (value) => value === "" || (value.length >= 3 && value.length <= 40),
        "Podaj numer telefonu (3–40 znaków).",
      ),
  ),
  notes: optional(
    z.string().trim().max(5000, "Notatka może mieć najwyżej 5000 znaków."),
  ),
});

export type ClientDetailsValues = z.input<typeof clientDetailsSchema>;

/** What saving a client's details answers. */
export type ClientUpdateResult =
  | { ok: true; upcomingUpdated: number }
  | { ok: false; message: string; fields?: Record<string, string> };

const MESSAGES: Record<string, string> = {
  email_taken:
    "Inny klient ma już ten adres e-mail. Łączenie kart klientów nie jest jeszcze dostępne.",
  invalid_details: "Sprawdź pola formularza.",
  not_found: "Nie znaleziono klienta.",
  forbidden: "Tylko administrator może to zrobić.",
};

/** Why a client's details could not be saved, in Polish. */
export function clientMessage(code: string | undefined) {
  return MESSAGES[code ?? ""] ?? "Nie udało się zapisać zmian.";
}
