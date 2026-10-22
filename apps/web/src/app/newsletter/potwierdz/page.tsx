import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { ConfirmNewsletter } from "@/features/newsletter/confirm-newsletter";

// The page behind the newsletter's confirmation link (?token=): the button
// that confirms the sign-up. The address carries a secret, so it is never
// indexed and never sent on as a referrer.

export const metadata: Metadata = {
  title: "Potwierdź zapis na newsletter",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ConfirmNewsletterPage({
  searchParams,
}: PageProps<"/newsletter/potwierdz">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  return (
    <PageIntro
      eyebrow="Newsletter"
      heading="Potwierdź zapis"
      accent="Jedno kliknięcie."
      lead={
        value
          ? "Kliknij przycisk, a dopiszemy Twój adres do newslettera Kolor Sensu."
          : "W tym linku brakuje kodu. Otwórz link z wiadomości jeszcze raz albo zapisz się ponownie na stronie głównej."
      }
    >
      {value ? <ConfirmNewsletter token={value} /> : null}
    </PageIntro>
  );
}
