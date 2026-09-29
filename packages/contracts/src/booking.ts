import { z } from "zod";

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
