"use client";

import { ArrowLink, PrimaryButton } from "@repo/ui/public-site/actions";
import { useActionState } from "react";
import { confirmNewsletterAction } from "./actions";
import type { NewsletterConfirmResult } from "./newsletter-shared";

// The newsletter's confirmation page: one button that confirms the sign-up
// (a click, not the link alone, so a mail program that opens links on its
// own signs nobody up), then what happened.

const DONE: Record<
  Exclude<NewsletterConfirmResult["status"], "idle">,
  { text: string; alert?: boolean }
> = {
  confirmed: {
    text: "Gotowe, jesteś na liście. Wysłaliśmy Ci krótkie powitanie, a pierwszy newsletter przyjdzie z najbliższym wydaniem. Wypisać się możesz w każdej chwili, linkiem w każdej wiadomości.",
  },
  already: {
    text: "Ten adres jest już na liście. Nic więcej nie trzeba robić.",
  },
  unknown: {
    text: "Ten link nie działa: wygasł (działa 7 dni) albo został zastąpiony nowszym. Zapisz się jeszcze raz na stronie głównej.",
    alert: true,
  },
  failed: {
    text: "Nie udało się potwierdzić zapisu. Spróbuj jeszcze raz za kilka minut.",
    alert: true,
  },
};

export function ConfirmNewsletter({ token }: { token: string }) {
  const [result, confirm, pending] = useActionState(confirmNewsletterAction, {
    status: "idle",
  } as NewsletterConfirmResult);

  if (result.status !== "idle" && result.status !== "failed") {
    const done = DONE[result.status];
    return (
      <div className="grid justify-items-start gap-4">
        <p
          className="text-body text-ink max-w-copy"
          role={done.alert ? "alert" : "status"}
        >
          {done.text}
        </p>
        <ArrowLink href="/">Wróć na stronę główną</ArrowLink>
      </div>
    );
  }

  return (
    <form action={confirm} className="grid justify-items-start gap-4">
      <input name="token" type="hidden" value={token} />
      {result.status === "failed" ? (
        <p className="text-body text-ink" role="alert">
          {DONE.failed.text}
        </p>
      ) : null}
      <PrimaryButton disabled={pending} type="submit">
        {pending ? "Potwierdzanie…" : "Potwierdzam zapis"}
      </PrimaryButton>
    </form>
  );
}
