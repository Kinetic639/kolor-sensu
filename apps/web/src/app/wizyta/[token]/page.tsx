import { reservationConfirmBy } from "@repo/supabase";
import { BookingSummary } from "@repo/ui/booking";
import { PrimaryButton, SecondaryButton } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { ContactDetails } from "@/components/contact-details";
import { sendVisitConfirmation } from "@/features/booking/email/confirmation-server";
import { visitByLinkToken } from "@/features/booking/guest-visit";
import { settleSession } from "@/features/booking/payment";
import { paymentDeps } from "@/features/booking/payment-server";
import { RefreshWhileWaiting } from "@/features/booking/refresh-while-waiting";
import { confirmReservationAction } from "@/features/booking/visit-actions";
import { staleLinkView } from "@/features/booking/stale-visit-link";
import { deadlineLabel } from "@/features/booking/visit-label";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";
import {
  visitPageCopy,
  type VisitChangeDone,
} from "@/features/booking/visit-page-copy";
import { visitSummaryItems } from "@/features/booking/visit-summary";

// The page behind the visit e-mails' link: the visit, a calendar file, and
// what the client may still change themselves (R8): move it or cancel it,
// by the centre's rules; a reservation not paid yet is paid from here, by
// its time (R11), and Stripe returns here (?sesja=), where the payment is
// settled as the webhook does; anything else through the centre. The address is
// a secret (the token), so it is never indexed and never sent on as a
// referrer.

export const metadata: Metadata = {
  title: "Twoja wizyta",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const STATUS: Record<string, { title: string; lead: string }> = {
  confirmed: {
    title: "Twoja wizyta jest potwierdzona",
    lead: "Do zobaczenia! Poniżej znajdziesz szczegóły wizyty.",
  },
  awaiting_payment: {
    title: "Czekamy na potwierdzenie płatności",
    lead: "Gdy bank potwierdzi płatność, wizyta zostanie potwierdzona.",
  },
  unconfirmed: {
    title: "Potwierdź swoją rezerwację",
    lead: "Termin czeka na Ciebie. Potwierdź rezerwację, a potem opłać wizytę online.",
  },
  reserved: {
    title: "Twoja wizyta czeka na płatność",
    lead: "Termin jest zarezerwowany dla Ciebie. Opłać wizytę online, a od razu ją potwierdzimy.",
  },
  cancelled: {
    title: "Wizyta została odwołana",
    lead: "Jeśli chcesz umówić nowy termin, zapraszamy ponownie.",
  },
};

const CHANGES: VisitChangeDone[] = ["przelozona", "odwolana", "potwierdzona"];

export default async function VisitPage({
  params,
  searchParams,
}: PageProps<"/wizyta/[token]">) {
  const { token } = await params;
  const { zmiana, sesja } = await searchParams;
  let visit = await visitByLinkToken(token);
  if (!visit) return <StaleLink outcome={await settleReturn(sesja, null)} />;

  // Back from Stripe: settle this visit's payment (idempotently).
  let pendingBank = false;
  if (typeof sesja === "string" && /^cs_/.test(sesja)) {
    const outcome = await settleReturn(sesja, visit.booking.reference, () =>
      redirect(`/wizyta/${token}/platnosc` as Route),
    );
    if (outcome) {
      pendingBank = outcome === "awaiting_payment";
      // Its confirmation e-mail may give the visit a new link meanwhile.
      const now = await visitByLinkToken(token);
      if (!now) return <StaleLink outcome={outcome} />;
      visit = now;
    }
  }

  const { booking, timeZone, policy } = visit;
  const reserved =
    booking.status === "awaiting_payment" &&
    booking.paymentDueAt !== null &&
    !pendingBank;
  // Reserved to pay later, not confirmed from the e-mail yet (30 minutes).
  const confirmBy = reserved
    ? await reservationConfirmBy(createSecretClient(), token).catch(() => null)
    : null;
  const status = STATUS[
    confirmBy ? "unconfirmed" : reserved ? "reserved" : booking.status
  ] ?? {
    title: "Ta rezerwacja nie jest aktywna",
    lead: "Jeśli masz pytania, skontaktuj się z nami.",
  };
  const copy = visitPageCopy({
    token,
    booking,
    policy,
    timeZone,
    change: CHANGES.find((change) => change === zmiana) ?? null,
  });

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="grid gap-2">
        <h1 className="font-display text-display text-ink">{status.title}</h1>
        <p className="text-body text-text-muted max-w-2xl">
          {copy.cancelledLead ?? status.lead}
        </p>
      </div>
      {pendingBank ? <RefreshWhileWaiting /> : null}
      {copy.notice ? (
        <p
          className="rounded-card-sm bg-primary-soft text-small text-ink max-w-2xl p-4"
          role="status"
        >
          {copy.notice}
        </p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <BookingSummary
          items={visitSummaryItems(booking, timeZone)}
          title={`Rezerwacja ${booking.reference}`}
        >
          {booking.status === "confirmed" ? (
            <SecondaryButton asChild size="sm">
              <a href={`/wizyta/${token}/kalendarz.ics` as Route} download>
                Dodaj do kalendarza
              </a>
            </SecondaryButton>
          ) : null}
        </BookingSummary>
        <div className="grid gap-5">
          {confirmBy ? (
            <section aria-labelledby="potwierdzenie" className="grid gap-3">
              <h2
                className="text-title text-ink font-semibold"
                id="potwierdzenie"
              >
                Potwierdzenie rezerwacji
              </h2>
              <p className="text-small text-text-muted">
                Potwierdź rezerwację do {deadlineLabel(confirmBy, timeZone)}.
                Bez potwierdzenia termin wróci do wolnych terminów.
              </p>
              <form action={confirmReservationAction}>
                <input name="token" type="hidden" value={token} />
                <PrimaryButton arrow type="submit">
                  Potwierdzam rezerwację
                </PrimaryButton>
              </form>
            </section>
          ) : copy.pay ? (
            <section aria-labelledby="platnosc" className="grid gap-3">
              <h2 className="text-title text-ink font-semibold" id="platnosc">
                Płatność
              </h2>
              <p className="text-small text-text-muted">{copy.pay.text}</p>
              <PrimaryButton arrow asChild className="justify-self-start">
                <Link href={copy.pay.href}>Zapłać za wizytę</Link>
              </PrimaryButton>
            </section>
          ) : null}
          {copy.reschedule || copy.cancel ? (
            <section aria-labelledby="zmiany" className="grid gap-4">
              <h2 className="text-title text-ink font-semibold" id="zmiany">
                Chcesz coś zmienić?
              </h2>
              {copy.reschedule ? (
                <div className="grid gap-2">
                  <p className="text-small text-text-muted">
                    {copy.reschedule.text}
                  </p>
                  {copy.reschedule.href ? (
                    <SecondaryButton
                      asChild
                      className="justify-self-start"
                      size="sm"
                    >
                      <Link href={copy.reschedule.href}>Przełóż wizytę</Link>
                    </SecondaryButton>
                  ) : null}
                </div>
              ) : null}
              {copy.cancel ? (
                <div className="grid gap-2">
                  <p className="text-small text-text-muted">
                    {copy.cancel.text}
                  </p>
                  <SecondaryButton
                    asChild
                    className="justify-self-start"
                    size="sm"
                  >
                    <Link href={copy.cancel.href}>Odwołaj wizytę</Link>
                  </SecondaryButton>
                </div>
              ) : null}
            </section>
          ) : null}
          <section aria-labelledby="kontakt" className="grid gap-3">
            <h2 className="text-title text-ink font-semibold" id="kontakt">
              Kontakt z centrum
            </h2>
            <p className="text-small text-text-muted">
              W innych sprawach skontaktuj się z nami i podaj numer rezerwacji.
            </p>
            <ContactDetails />
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Stripe's return (?sesja=): the payment settled as the webhook does
 * (idempotently), for the visit `reference`, or for the session's own when
 * the link no longer finds one (null). Its outcome; null with none.
 */
async function settleReturn(
  sesja: string | string[] | undefined,
  reference: string | null,
  onOpen?: () => never,
) {
  if (typeof sesja !== "string" || !/^cs_/.test(sesja)) return null;
  const session = await stripeServer()
    .checkout.sessions.retrieve(sesja)
    .catch(() => null);
  const ours = session?.metadata?.appointment_reference;
  if (!session || !ours || (reference !== null && ours !== reference)) {
    return null;
  }
  if (session.status === "open") onOpen?.();
  if (session.status !== "complete") return null;
  return settleSession(session, {
    ...paymentDeps(),
    onConfirmed: async (confirmed) => {
      after(() => sendVisitConfirmation(confirmed));
    },
  });
}

/** A link an e-mail since replaced (#259): no "page does not exist". */
function StaleLink({ outcome }: { outcome: string | null }) {
  const view = staleLinkView(outcome);
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="grid gap-2">
        <h1 className="font-display text-display text-ink">{view.title}</h1>
        <p className="text-body text-text-muted max-w-2xl">{view.lead}</p>
      </div>
      <section aria-labelledby="kontakt" className="grid max-w-2xl gap-3">
        <h2 className="text-title text-ink font-semibold" id="kontakt">
          Kontakt z centrum
        </h2>
        <ContactDetails />
      </section>
    </div>
  );
}
