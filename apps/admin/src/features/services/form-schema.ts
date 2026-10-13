import { serviceCreateSchema } from "@repo/contracts";
import { z } from "zod";

// The new-service form: the catalogue's rules (@repo/contracts), with what
// is wrong said in Polish next to each field (#43).

const minutes = z
  .number({ error: "Podaj czas w minutach." })
  .int("Podaj pełne minuty.")
  .min(15, "Od 15 do 300 minut.")
  .max(300, "Od 15 do 300 minut.");

export const serviceFormSchema = serviceCreateSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, "Podaj nazwę usługi.")
    .max(200, "Nazwa może mieć najwyżej 200 znaków."),
  slug: z
    .string()
    .trim()
    .min(3, "Podaj adres na stronie (co najmniej 3 znaki).")
    .max(100, "Adres może mieć najwyżej 100 znaków.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Tylko małe litery bez polskich znaków, cyfry i myślniki, np. psychoterapia-indywidualna.",
    ),
  shortDescription: z
    .string()
    .trim()
    .max(500, "Krótki opis może mieć najwyżej 500 znaków.")
    .nullable()
    .default(null),
  description: z
    .string()
    .trim()
    .max(10_000, "Opis może mieć najwyżej 10 000 znaków.")
    .nullable()
    .default(null),
  defaultDurationMinutes: minutes,
  sortOrder: z
    .number({ error: "Podaj liczbę." })
    .int("Podaj liczbę całkowitą.")
    .min(0, "Kolejność od 0 do 10 000.")
    .max(10_000, "Kolejność od 0 do 10 000.")
    .default(0),
});
