import { PrimaryButton, SecondaryButton } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { BookingStep, readGuestVisit } from "@/features/booking/booking-step";
import { sendVisitConfirmation } from "@/features/booking/email/confirmation-server";
import { settleSession } from "@/features/booking/payment";
import { paymentDeps } from "@/features/booking/payment-server";
import { RefreshWhileWaiting } from "@/features/booking/refresh-while-waiting";
import { bookingHref } from "@/features/booking/search-params";
import { stripeServer } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Potwierdzenie · Umów wizytę",
  robots: { index: false },
};

// Step 6, where Stripe returns the client. The payment is settled here too
// (idempotently), since Stripe's webhook may come later; the visit itself
// is shown only to the browser holding the guest's cookie.
export default async function BookingConfirmationPage({
  searchParams,
}: PageProps<"/umow-wizyte/potwierdzenie">) {
  const { sesja, bezplatna, zarezerwowana } = await searchParams;
  // A visit a discount code made free: confirmed, nothing was paid.
  if (bezplatna === "1") return <FreeConfirmation />;
  // Reserved to pay later: confirmed from the e-mail, not here.
  if (zarezerwowana === "1") return <CheckEmail />;
  const sessionId =
    typeof sesja === "string" && /^cs_/.test(sesja) ? sesja : null;
  if (!sessionId) redirect(bookingHref({}));

  const session = await stripeServer()
    .checkout.sessions.retrieve(sessionId)
    .catch(() => null);
  if (!session) redirect(bookingHref({}));
  // Back from a payment that did not go through: try again.
  if (session.status === "open") redirect("/umow-wizyte/platnosc" as Route);

  const outcome =
    session.status === "complete"
      ? await settleSession(session, {
          ...paymentDeps(),
          // The e-mail goes after the page is sent, not before.
          onConfirmed: async (reference) => {
            after(() => sendVisitConfirmation(reference));
          },
        })
      : null;
  // Only the visit this payment was for (the cookie may hold another).
  const guest = await readGuestVisit();
  const visit =
    guest && guest.booking.reference === session.metadata?.appointment_reference
      ? guest
      : null;

  const status = visit?.booking.status;
  const refunded = outcome === "refund_payment";
  const settled = outcome === "already_settled";
  // A second payment for a visit paid already says it went back.
  const confirmed =
    !refunded && (status === "confirmed" || outcome === "confirmed");
  const waiting = !confirmed && status === "awaiting_payment";
  const lost = outcome === "slot_lost";

  const message = confirmed
    ? {
        title: "Wizyta potwierdzona",
        lead: "Dziękujemy! Płatność została przyjęta, a termin jest Twój. Potwierdzenie wyślemy na Twój adres e-mail.",
      }
    : waiting
      ? {
          title: "Oczekujemy na potwierdzenie płatności",
          lead: "Płatność jest w toku. Ta strona odświeży się sama, gdy bank ją potwierdzi; zwykle trwa to kilka chwil.",
        }
      : lost
        ? {
            title: "Termin został zajęty",
            lead: "Płatność dotarła po tym, jak termin zajęła inna osoba. Zwróciliśmy pieniądze; wybierz, proszę, inny termin.",
          }
        : refunded
          ? {
              title: "Zwróciliśmy tę płatność",
              lead: "Ta wizyta była już opłacona albo jej cena się zmieniła, więc tę płatność oddaliśmy w całości. Stan wizyty znajdziesz w linku z wiadomości e-mail.",
            }
          : settled
            ? {
                title: "Ta płatność jest już rozliczona",
                lead: "Stan wizyty i ewentualnego zwrotu znajdziesz w linku z wiadomości e-mail.",
              }
            : {
                title: "Płatność nie została zakończona",
                lead: "Nie pobraliśmy żadnej opłaty. Możesz spróbować ponownie albo wybrać inny termin.",
              };

  if (!visit) {
    return (
      <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 pt-8 lg:pt-12">
        <h1 className="font-display text-display text-ink">{message.title}</h1>
        <p className="text-body text-text-muted max-w-2xl">{message.lead}</p>
        {waiting ? <RefreshWhileWaiting /> : null}
      </div>
    );
  }

  return (
    <BookingStep
      current={confirmed ? 6 : 5}
      lead={message.lead}
      title={message.title}
      visit={visit}
    >
      {waiting ? <RefreshWhileWaiting /> : null}
      <div className="flex flex-wrap gap-3">
        {confirmed ? (
          <PrimaryButton arrow asChild>
            <Link href="/">Wróć na stronę główną</Link>
          </PrimaryButton>
        ) : waiting ? null : (
          <SecondaryButton asChild>
            <Link href={bookingHref({})}>Wybierz termin</Link>
          </SecondaryButton>
        )}
      </div>
    </BookingStep>
  );
}

/** A visit confirmed without a payment: its code covered the whole price. */
async function FreeConfirmation() {
  const visit = await readGuestVisit();
  if (!visit || visit.booking.status !== "confirmed") redirect(bookingHref({}));
  return (
    <BookingStep
      current={6}
      lead="Kod rabatowy pokrył całą cenę, więc niczego nie pobraliśmy. Potwierdzenie wyślemy na Twój adres e-mail."
      title="Wizyta potwierdzona"
      visit={visit}
    >
      <PrimaryButton arrow asChild>
        <Link href="/">Wróć na stronę główną</Link>
      </PrimaryButton>
    </BookingStep>
  );
}

/**
 * Reserved to pay later: the link to confirm it went by e-mail, so the
 * address is checked before the time is held for longer.
 */
function CheckEmail() {
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 pt-8 lg:pt-12">
      <h1 className="font-display text-display text-ink">
        Sprawdź skrzynkę e-mail
      </h1>
      <div className="text-body text-text-muted grid max-w-2xl gap-3">
        <p>
          Wysłaliśmy Ci wiadomość z linkiem do rezerwacji. Otwórz go i kliknij
          „Potwierdzam rezerwację” w ciągu 30 minut, a termin poczeka na Ciebie
          do czasu płatności.
        </p>
        <p>
          Bez potwierdzenia termin wróci do wolnych terminów. Nie widzisz
          wiadomości? Zajrzyj do folderu spam albo oferty.
        </p>
      </div>
      <PrimaryButton arrow asChild className="justify-self-start">
        <Link href="/">Wróć na stronę główną</Link>
      </PrimaryButton>
    </div>
  );
}
