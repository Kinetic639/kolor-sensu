import { z } from "zod";

// The contact form on /kontakt (docs/architecture/cms-domain.md, "Kontakt"):
// what a visitor sends. The messages are kept in contact_messages and the
// centre is told by e-mail; nothing here is health data on purpose (the form
// asks not to write about it).

export const CONTACT_MESSAGE_MAX = 5000;

export const contactMessageInputSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Podaj imię")
    .max(120, "Imię może mieć do 120 znaków"),
  email: z
    .string()
    .trim()
    .max(254, "Adres e-mail jest za długi")
    .email("Podaj poprawny adres e-mail"),
  phone: z
    .string()
    .trim()
    .max(30, "Numer może mieć do 30 znaków")
    .regex(/^[+0-9 ()-]*$/, "Numer może mieć tylko cyfry, spacje i +"),
  message: z
    .string()
    .trim()
    .min(1, "Napisz wiadomość")
    .max(CONTACT_MESSAGE_MAX, "Wiadomość może mieć do 5000 znaków"),
  consent: z.literal(true, {
    error: "Potwierdź, że zapoznałeś się z informacją o danych",
  }),
});

export type ContactMessageInput = z.infer<typeof contactMessageInputSchema>;
