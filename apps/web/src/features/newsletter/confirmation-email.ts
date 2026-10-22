import type { EmailLook } from "@/features/booking/email/confirmation-email";

// The e-mail with the link that confirms a newsletter sign-up (double
// opt-in): until it is clicked, the address gets nothing else, and it goes
// after 7 days. The link opens a page with a button (a mail program that
// opens links on its own does not sign anyone up).

export interface NewsletterConfirmationContent extends EmailLook {
  subject: string;
  text: string;
}

export function newsletterConfirmationContent(
  confirmUrl: string,
): NewsletterConfirmationContent {
  const intro =
    "dziękujemy za zapis na newsletter Kolor Sensu. Kliknij przycisk, żeby potwierdzić, że to Twój adres. Link działa przez 7 dni.";
  const note =
    "Jeśli ten adres podał ktoś inny, zignoruj tę wiadomość: bez potwierdzenia nic więcej nie wyślemy, a adres usuniemy po 7 dniach.";
  return {
    subject: "Potwierdź zapis na newsletter Kolor Sensu",
    preview: "Jedno kliknięcie i jesteśmy w kontakcie.",
    heading: "Potwierdź zapis na newsletter",
    greeting: "Dzień dobry,",
    intro,
    rows: [],
    manageUrl: confirmUrl,
    buttonLabel: "Potwierdzam zapis",
    note,
    contactLine: null,
    farewell: "Do usłyszenia,",
    text: [
      "Dzień dobry,",
      "",
      intro,
      "",
      `Potwierdź zapis: ${confirmUrl}`,
      "",
      note,
      "",
      "Do usłyszenia,",
      "Kolor Sensu",
    ].join("\n"),
  };
}

/** The confirmation page's address with the link's token. */
export function newsletterConfirmUrl(siteUrl: string, token: string) {
  return `${siteUrl}/newsletter/potwierdz?token=${encodeURIComponent(token)}`;
}
