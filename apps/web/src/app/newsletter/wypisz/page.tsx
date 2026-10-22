import { findNewsletterUnsubscribe } from "@repo/supabase/newsletter";
import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import {
  isUnsubscribeCode,
  maskEmail,
} from "@/features/newsletter/unsubscribe-code";
import { UnsubscribeNewsletter } from "@/features/newsletter/unsubscribe-newsletter";
import { createSecretClient } from "@/lib/supabase/secret";

// The page behind each issue's unsubscribe link (?kod=): the address it is
// for (masked) and the button that takes it off the list. The address
// carries a secret, so it is never indexed and never sent on as a referrer.

export const metadata: Metadata = {
  title: "Wypisz się z newslettera",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

async function addressFor(code: string) {
  if (!isUnsubscribeCode(code)) return null;
  try {
    return await findNewsletterUnsubscribe(createSecretClient(), code);
  } catch (error) {
    console.error("[newsletter] reading the unsubscribe link failed:", error);
    return null;
  }
}

export default async function UnsubscribeNewsletterPage({
  searchParams,
}: PageProps<"/newsletter/wypisz">) {
  const { kod } = await searchParams;
  const code = typeof kod === "string" ? kod : "";
  const address = await addressFor(code);
  const stopped =
    address !== null && !["pending", "active"].includes(address.status);

  return (
    <PageIntro
      eyebrow="Newsletter"
      heading="Wypisz się z newslettera"
      accent={address && !stopped ? "Jedno kliknięcie." : undefined}
      lead={
        !address
          ? "Ten link nie działa. Otwórz go jeszcze raz z wiadomości albo odpisz na newsletter, a wypiszemy Cię ręcznie."
          : stopped
            ? `Adres ${maskEmail(address.email)} jest już wypisany z newslettera. Nic więcej nie trzeba robić.`
            : `Kliknij przycisk, a przestaniemy wysyłać newsletter Kolor Sensu na adres ${maskEmail(address.email)}. Wiadomości o Twoich wizytach będą przychodzić jak dotąd.`
      }
    >
      {address && !stopped ? <UnsubscribeNewsletter code={code} /> : null}
    </PageIntro>
  );
}
