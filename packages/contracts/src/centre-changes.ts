import { z } from "zod";
import { localDateSchema } from "./availability";

// The centre settling a visit its own way (docs/product/booking-plan.md,
// R12): cancelling with the refund the admin chooses, giving money back
// later, moving a visit anywhere free. What the portal sends to the site;
// the database checks it all again.

const MONEY = /^\d{1,6}(?:[.,]\d{1,2})?$/;

/** `150`, `150,50` or `150.5` złoty as grosze; null when it is not money. */
export function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim();
  if (!MONEY.test(trimmed)) return null;
  return Math.round(Number(trimmed.replace(",", ".")) * 100);
}

const reasonSchema = z
  .string()
  .trim()
  .max(500, "Powód może mieć najwyżej 500 znaków.")
  .nullish()
  .transform((value) => value || null);

export const centreCancelRequestSchema = z.object({
  /** Null: all that is left of the payment. */
  refundMinor: z
    .number()
    .int()
    .min(0)
    .nullish()
    .transform((v) => v ?? null),
  reason: reasonSchema,
});

export const centreRefundRequestSchema = z.object({
  refundMinor: z.number().int().min(1, "Podaj kwotę zwrotu."),
  reason: reasonSchema,
});

/** Settling what is owed (R14): nothing to choose, the database knows how much. */
export const centreSettleRequestSchema = z.object({}).strict();

export const centreMoveSchema = z
  .object({
    date: localDateSchema,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj godzinę (GG:MM)."),
    mode: z.enum(["in_person", "online"]),
    roomId: z.uuid("Wybierz gabinet.").nullable(),
    reason: reasonSchema,
  })
  .superRefine((move, context) => {
    if (move.mode === "in_person" && !move.roomId) {
      context.addIssue({
        code: "custom",
        path: ["roomId"],
        message: "Wybierz gabinet.",
      });
    }
  });

export type CentreMoveValues = z.input<typeof centreMoveSchema>;

/** What a portal's cancel, refund or move action answers. */
export type CentreChangeResult =
  | {
      ok: true;
      /** Stripe refused the refund: to settle in Stripe by hand. */
      refundFailed?: boolean;
    }
  | { ok: false; message: string; fields?: Record<string, string> };

const MESSAGES: Record<string, string> = {
  refund_too_high: "Nie można zwrócić więcej, niż zostało z płatności.",
  not_paid: "Ta wizyta nie została opłacona: nie ma czego zwracać.",
  not_cancellable: "Tej wizyty nie można już odwołać.",
  not_reschedulable: "Tej wizyty nie można przesunąć.",
  nothing_changed:
    "Wizyta już jest w tym terminie i miejscu. Wybierz inną godzinę, gabinet lub formę.",
  not_found: "Nie znaleziono wizyty.",
  forbidden: "Tylko administrator może to zrobić.",
  specialist_busy: "Specjalista ma wtedy inną wizytę (albo przerwę po niej).",
  room_busy: "Gabinet jest wtedy zajęty.",
  room_closed: "Gabinet jest wtedy zamknięty.",
  centre_closed: "Centrum jest wtedy zamknięte.",
  room_required: "Wybierz gabinet.",
  time_off: "Specjalista ma wtedy nieobecność.",
  in_the_past: "Ten termin już minął.",
  not_bookable: "Tej usługi nie można prowadzić w tej formie.",
  too_soon:
    "Rezerwacja nie jest opłacona, a do tego terminu zostało za mało czasu na płatność.",
  invalid: "Sprawdź pola formularza.",
  nothing_owed: "Ta wizyta jest już rozliczona.",
  recently_settled:
    "Zwrot dla tej wizyty został zlecony przed chwilą. Odśwież stronę za minutę.",
};

/** Why a change could not be made, in Polish. */
export function centreChangeMessage(code: string | undefined) {
  return MESSAGES[code ?? ""] ?? "Nie udało się zapisać zmiany.";
}
