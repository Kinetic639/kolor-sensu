import { formatPrice } from "@/lib/format";
import {
  contactLineOf,
  type ConfirmationOptions,
} from "./confirmation-content";
import type { VisitEmailContent } from "./confirmation-content";

// The payment came after the time was taken by someone else (Klient · 4,
// card 17): the whole amount goes back, and the client is told why and how
// to book another time. Sent once, with the refund (the database settles a
// payment once).

export interface SlotLostEmail {
  reference: string;
  amountMinor: number;
  currencyCode: string;
}

export function slotLostContent(
  payment: SlotLostEmail,
  { siteUrl, contact }: Pick<ConfirmationOptions, "siteUrl" | "contact">,
): Omit<VisitEmailContent, "ics"> & { farewell: string } {
  const amount = formatPrice({
    priceMinor: payment.amountMinor,
    currencyCode: payment.currencyCode.toUpperCase(),
  });
  const greeting = "Dzień dobry,";
  const intro = `Twoja płatność za rezerwację ${payment.reference} dotarła po tym, jak wybrany termin zajęła inna osoba, więc wizyta nie mogła zostać potwierdzona. Zwróciliśmy całą kwotę na Twoje konto; zwykle trwa to kilka dni roboczych. Wybierz, proszę, inny termin.`;
  const rows: [string, string][] = [
    ["Numer rezerwacji", payment.reference],
    ["Zwrot", amount],
  ];
  const manageUrl = `${siteUrl}/umow-wizyte`;
  const buttonLabel = "Wybierz inny termin";
  const contactLine = contactLineOf(contact);
  return {
    subject: `Zwrot płatności za rezerwację ${payment.reference} – termin zajęty`,
    preview: "Termin został zajęty, zwróciliśmy całą płatność",
    heading: "Zwróciliśmy płatność",
    greeting,
    intro,
    rows,
    manageUrl,
    buttonLabel,
    note: null,
    contactLine,
    farewell: "Pozdrawiamy,",
    text: [
      greeting,
      "",
      intro,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      `${buttonLabel}: ${manageUrl}`,
      ...(contactLine
        ? ["", `Masz pytania? Skontaktuj się z nami: ${contactLine}`]
        : []),
      "",
      "Kolor Sensu",
    ].join("\n"),
  };
}
