"use client";

import { useSave } from "@/lib/use-save";
import {
  NEWSLETTER_SOURCE_LABELS,
  NEWSLETTER_STATUS_LABELS,
  NEWSLETTER_STOP_REASON_LABELS,
  type NewsletterStatus,
  type NewsletterSubscriber,
} from "@repo/contracts/newsletter";
import type { NewsletterConsent } from "@repo/supabase/newsletter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { Tag } from "@repo/ui/visit-table";
import { FileCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  newsletterConsentAction,
  removeNewsletterSubscriberAction,
} from "./actions";

// Newsletter: every address, newest first, as a compact table: the
// address, its state (with why it stopped), where it signed up, when, and
// when it confirmed. "Zgoda" shows the consent it gave, word for word;
// "Usuń" removes it here and in Resend, after a confirmation naming it.

const STATUS_TONES = {
  active: "success",
  pending: "info",
  unsubscribed: "neutral",
  removing: "warning",
} as const satisfies Record<NewsletterStatus, string>;

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});
const when = (iso: string | null) => (iso ? DATE.format(new Date(iso)) : "—");

export function NewsletterSubscriberList({
  subscribers,
}: {
  subscribers: readonly NewsletterSubscriber[];
}) {
  const head =
    "h-8 border-b border-[var(--border)] px-3 text-left text-[0.75rem] font-medium text-[var(--text-muted)]";
  const cell = "h-[30px] border-b border-[var(--border)] px-3 text-[0.8125rem]";

  if (subscribers.length === 0) {
    return (
      <p className="px-3.5 py-6 text-sm text-[var(--text-muted)]">
        Nikt się jeszcze nie zapisał. Formularz pojawi się na stronie, gdy
        włączysz sekcję „Newsletter” w CMS (Strona główna).
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Adresy zapisane na newsletter</caption>
        <thead>
          <tr>
            <th className={head} scope="col">
              Adres
            </th>
            <th className={head} scope="col">
              Stan
            </th>
            <th className={`${head} hidden md:table-cell`} scope="col">
              Skąd
            </th>
            <th className={`${head} hidden sm:table-cell`} scope="col">
              Zapis
            </th>
            <th className={`${head} hidden lg:table-cell`} scope="col">
              Potwierdzenie
            </th>
            <th className={head} scope="col">
              <span className="sr-only">Akcje</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {subscribers.map((subscriber) => (
            <tr
              className="hover:bg-[var(--surface-subtle)]"
              key={subscriber.id}
            >
              <th
                className={`${cell} text-left font-medium break-all`}
                scope="row"
              >
                {subscriber.email}
              </th>
              <td className={`${cell} whitespace-nowrap`}>
                <Tag tone={STATUS_TONES[subscriber.status]}>
                  {NEWSLETTER_STATUS_LABELS[subscriber.status]}
                </Tag>
                {subscriber.stopReason ? (
                  <span className="ml-2 text-[0.75rem] text-[var(--text-muted)]">
                    {NEWSLETTER_STOP_REASON_LABELS[subscriber.stopReason]}
                  </span>
                ) : null}
              </td>
              <td
                className={`${cell} hidden text-[var(--text-muted)] md:table-cell`}
              >
                {NEWSLETTER_SOURCE_LABELS[subscriber.source]}
              </td>
              <td
                className={`${cell} hidden text-[var(--text-muted)] tabular-nums sm:table-cell`}
              >
                {when(subscriber.requestedAt)}
              </td>
              <td
                className={`${cell} hidden text-[var(--text-muted)] tabular-nums lg:table-cell`}
              >
                {when(subscriber.confirmedAt)}
              </td>
              <td className={`${cell} text-right whitespace-nowrap`}>
                <ShowConsent subscriber={subscriber} />{" "}
                {subscriber.status === "removing" ? null : (
                  <RemoveSubscriber subscriber={subscriber} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShowConsent({ subscriber }: { subscriber: NewsletterSubscriber }) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<NewsletterConsent | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  function show() {
    setOpen(true);
    startTransition(async () => {
      const found = await newsletterConsentAction(subscriber.id);
      setConsent(found);
      setFailed(found === null);
    });
  }
  return (
    <>
      <button
        aria-label={`Zgoda adresu ${subscriber.email}`}
        className={DETAIL_BUTTON}
        onClick={show}
        title="Zgoda"
        type="button"
      >
        <FileCheck aria-hidden="true" />
      </button>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zgoda: {subscriber.email}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-2 text-left">
                {isPending ? (
                  <p>Wczytywanie…</p>
                ) : failed || !consent ? (
                  <p>Nie udało się wczytać zgody. Spróbuj jeszcze raz.</p>
                ) : (
                  <>
                    <p>„{consent.consentText}”</p>
                    <p>
                      Wersja {consent.consentVersion}. Zapis:{" "}
                      {when(consent.requestedAt)}, potwierdzenie linkiem:{" "}
                      {when(consent.confirmedAt)}.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zamknij</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RemoveSubscriber({
  subscriber,
}: {
  subscriber: NewsletterSubscriber;
}) {
  const { isPending, run } = useSave();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label={`Usuń adres ${subscriber.email}`}
        className={DETAIL_BUTTON}
        disabled={isPending}
        onClick={() => setOpen(true)}
        title="Usuń"
        type="button"
      >
        <Trash2 aria-hidden="true" />
      </button>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć {subscriber.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Adres i jego zgoda znikną z listy, a w ciągu kilku minut także z
              Resend, więc nie dostanie już newslettera. Użyj tego, gdy ktoś
              prosi o usunięcie danych; zwykły wypis działa sam, linkiem w
              wiadomości. Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() =>
                run(
                  () => removeNewsletterSubscriberAction(subscriber.id),
                  "Usunięto adres",
                )
              }
            >
              Usuń adres
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
