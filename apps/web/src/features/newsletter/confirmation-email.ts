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

/**
 * The welcome, right after the sign-up is confirmed: what the newsletter
 * brings and how often, where to start meanwhile (the articles), and that
 * every issue has a link to unsubscribe.
 */
export function newsletterWelcomeContent(
  siteUrl: string,
): NewsletterConfirmationContent {
  const educationUrl = `${siteUrl}/edukacja`;
  const intro =
    "dziękujemy za potwierdzenie: jesteś na liście newslettera Kolor Sensu. Mniej więcej raz w miesiącu napiszemy o nowych artykułach, warsztatach i tym, co dzieje się w centrum. Bez zalewu wiadomości.";
  const note =
    "Na początek zajrzyj do naszych artykułów. Wypisać się możesz w każdej chwili, linkiem na dole każdego newslettera.";
  return {
    subject: "Witaj w newsletterze Kolor Sensu",
    preview: "Raz w miesiącu: artykuły, warsztaty i nowości z centrum.",
    heading: "Miło, że jesteś z nami",
    greeting: "Dzień dobry,",
    intro,
    rows: [],
    manageUrl: educationUrl,
    buttonLabel: "Przeczytaj artykuły",
    note,
    contactLine: null,
    farewell: "Do usłyszenia,",
    text: [
      "Dzień dobry,",
      "",
      intro,
      "",
      `Przeczytaj artykuły: ${educationUrl}`,
      "",
      note,
      "",
      "Do usłyszenia,",
      "Kolor Sensu",
    ].join("\n"),
  };
}
