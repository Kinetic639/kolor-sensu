"use client";

import { ArrowLink, PrimaryButton } from "@repo/ui/public-site/actions";
import { useActionState } from "react";
import { unsubscribeNewsletterAction } from "./actions";
import type { NewsletterUnsubscribeResult } from "./newsletter-shared";

// The newsletter's unsubscribe page: one button (a click, not the link
// alone, so a mail program that opens links on its own unsubscribes nobody),
// then what happened.

const DONE: Record<
  Exclude<NewsletterUnsubscribeResult["status"], "idle">,
  { text: string; alert?: boolean }
> = {
  stopped: {
    text: "Gotowe, wypisaliśmy Cię z newslettera. Nie wyślemy Ci już kolejnych wydań. Jeśli zmienisz zdanie, zapisz się ponownie na stronie.",
  },
  already: {
    text: "Ten adres jest już wypisany z newslettera. Nic więcej nie trzeba robić.",
  },
  unknown: {
    text: "Ten link nie działa. Odpisz na wiadomość z newslettera, a wypiszemy Cię ręcznie.",
    alert: true,
  },
  failed: {
    text: "Nie udało się wypisać adresu. Spróbuj jeszcze raz za kilka minut.",
    alert: true,
  },
};

export function UnsubscribeNewsletter({ code }: { code: string }) {
  const [result, unsubscribe, pending] = useActionState(
    unsubscribeNewsletterAction,
    { status: "idle" } as NewsletterUnsubscribeResult,
  );

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
    <form action={unsubscribe} className="grid justify-items-start gap-4">
      <input name="kod" type="hidden" value={code} />
      {result.status === "failed" ? (
        <p className="text-body text-ink" role="alert">
          {DONE.failed.text}
        </p>
      ) : null}
      <PrimaryButton disabled={pending} type="submit">
        {pending ? "Wypisywanie…" : "Wypisz mnie z newslettera"}
      </PrimaryButton>
    </form>
  );
}
