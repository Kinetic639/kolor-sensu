import { z } from "zod";
import { localDateSchema } from "./availability";

// The client's details in online booking (docs/product/booking-plan.md,
// R5): only what the visit needs. The database checks the same limits.

const PHONE = /^\+?[\d\s()-]+$/;

export const bookingDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Podaj imię i nazwisko.")
    .max(200, "Imię i nazwisko mogą mieć najwyżej 200 znaków."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, "Podaj poprawny adres e-mail.")
    .pipe(z.email("Podaj poprawny adres e-mail.")),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => {
        const digits = value.replace(/\D/g, "").length;
        return PHONE.test(value) && digits >= 9 && digits <= 15;
      },
      { message: "Podaj numer telefonu (9–15 cyfr)." },
    ),
  notes: z
    .string()
    .trim()
    .max(1000, "Uwagi mogą mieć najwyżej 1000 znaków.")
    .transform((value) => value || null),
  acceptTerms: z.literal(true, {
    error: "Zaakceptuj regulamin, aby zarezerwować wizytę.",
  }),
  acceptPrivacy: z.literal(true, {
    error: "Zaakceptuj politykę prywatności, aby zarezerwować wizytę.",
  }),
});

export type BookingDetailsInput = z.input<typeof bookingDetailsSchema>;
export type BookingDetails = z.output<typeof bookingDetailsSchema>;

const optional = (value: string) => value || null;
const isPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").length;
  return PHONE.test(value) && digits >= 9 && digits <= 15;
};

// A visit the centre books from the calendar (K5): the offer (who gives
// which service), how, when (the centre's local date and time) and where;
// the client's e-mail, where the link to pay goes (nothing is paid on
// site, R11). The database checks it again.
export const centreBookingSchema = z
  .object({
    offerId: z.uuid("Wybierz usługę."),
    mode: z.enum(["in_person", "online"]),
    date: localDateSchema,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj godzinę (GG:MM)."),
    roomId: z.uuid("Wybierz gabinet.").nullable(),
    name: z
      .string()
      .trim()
      .min(2, "Podaj imię i nazwisko.")
      .max(200, "Imię i nazwisko mogą mieć najwyżej 200 znaków."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Podaj e-mail klienta: wyślemy na niego link do płatności.")
      .max(320, "Podaj poprawny adres e-mail.")
      .refine((value) => !value || z.email().safeParse(value).success, {
        message: "Podaj poprawny adres e-mail.",
      }),
    phone: z
      .string()
      .trim()
      .refine((value) => !value || isPhone(value), {
        message: "Podaj numer telefonu (9–15 cyfr).",
      })
      .transform(optional),
    notes: z
      .string()
      .trim()
      .max(1000, "Uwagi mogą mieć najwyżej 1000 znaków.")
      .transform(optional),
  })
  .superRefine((booking, context) => {
    if (booking.mode === "in_person" && !booking.roomId) {
      context.addIssue({
        code: "custom",
        path: ["roomId"],
        message: "Wybierz gabinet.",
      });
    }
  });

export type CentreBookingValues = z.input<typeof centreBookingSchema>;
export type CentreBooking = z.output<typeof centreBookingSchema>;

/** What a portal's booking action answers. */
export type CentreBookingActionResult =
  | {
      ok: true;
      id: string;
      reference: string;
      /** To be paid by then (an instant), or it is cancelled. */
      paymentDueAt: string;
      /** The e-mail with the link to pay. */
      emailed: "sent" | "skipped" | "failed";
    }
  | { ok: false; message: string; fields?: Record<string, string> };

const CENTRE_BOOKING_MESSAGES: Record<string, string> = {
  specialist_busy: "Specjalista ma wtedy inną wizytę (albo przerwę po niej).",
  room_busy: "Gabinet jest wtedy zajęty.",
  room_closed: "Gabinet jest wtedy zamknięty.",
  room_required: "Wybierz gabinet.",
  time_off: "Specjalista ma wtedy nieobecność.",
  in_the_past: "Ten termin już minął.",
  not_bookable: "Tej usługi nie można zarezerwować w tej formie.",
  invalid_details: "Sprawdź dane klienta.",
  invalid: "Sprawdź pola formularza.",
  forbidden: "Nie możesz zapisać tej wizyty.",
  too_soon:
    "Do wizyty zostało za mało czasu na płatność online. Wybierz późniejszy termin.",
};

/** Why a visit could not be booked, in Polish. */
export function centreBookingMessage(code: string | undefined) {
  return CENTRE_BOOKING_MESSAGES[code ?? ""] ?? "Nie udało się zapisać wizyty.";
}
