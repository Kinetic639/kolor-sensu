import { z } from "zod";

// Closing a visit (the specialist's, or the centre's): did it take place
// or did the client not come, a few tags about the visit itself and a
// short note for the centre. Organisational only, never about health; seen
// by the visit's specialist and the admins.

export const VISIT_OUTCOMES = [
  { value: "attended", label: "Odbyła się" },
  { value: "no_show", label: "Klient nie przyszedł" },
] as const;

export type VisitOutcome = (typeof VISIT_OUTCOMES)[number]["value"];

export const VISIT_TAGS = [
  { value: "late", label: "Spóźnienie klienta" },
  { value: "shortened", label: "Skrócona wizyta" },
  { value: "difficult", label: "Trudny kontakt" },
  { value: "follow_up", label: "Do kontaktu z centrum" },
  { value: "technical", label: "Problem techniczny" },
] as const;

export type VisitTag = (typeof VISIT_TAGS)[number]["value"];

const TAG_VALUES = VISIT_TAGS.map((tag) => tag.value) as [
  VisitTag,
  ...VisitTag[],
];

export const visitClosingSchema = z.object({
  outcome: z.enum(["attended", "no_show"], {
    error: "Wybierz, czy wizyta się odbyła.",
  }),
  tags: z
    .array(z.enum(TAG_VALUES))
    .default([])
    .transform((tags) => [...new Set(tags)]),
  note: z
    .string()
    .trim()
    .max(300, "Najwyżej 300 znaków: krótka notatka organizacyjna.")
    .nullish()
    .transform((note) => note || null),
});

export type VisitClosingInput = z.input<typeof visitClosingSchema>;
export type VisitClosing = z.output<typeof visitClosingSchema>;

/** A visit's closing as its panel shows it. */
export interface VisitClosingView extends VisitClosing {
  closedAt: string;
  closedByName: string | null;
}

export const outcomeLabel = (outcome: VisitOutcome) =>
  VISIT_OUTCOMES.find((one) => one.value === outcome)!.label;

export const tagLabel = (tag: VisitTag) =>
  VISIT_TAGS.find((one) => one.value === tag)?.label ?? tag;

const MESSAGES: Record<string, string> = {
  not_closable: "Zamknąć można tylko opłaconą wizytę, która już się zaczęła.",
  forbidden: "To nie Twoja wizyta.",
  not_found: "Nie znaleziono wizyty.",
  invalid: "Sprawdź tagi i notatkę.",
};

/** Why a visit could not be closed, in Polish. */
export function closingMessage(code: string | undefined) {
  return (code && MESSAGES[code]) ?? "Nie udało się zamknąć wizyty.";
}
