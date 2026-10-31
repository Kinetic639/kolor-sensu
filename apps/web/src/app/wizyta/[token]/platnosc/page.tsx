import { pendingReservationPayment } from "@repo/supabase";
import { BookingSummary } from "@repo/ui/booking";
import { ArrowLink } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { visitByLinkToken } from "@/features/booking/guest-visit";
import { centrePhone } from "@/features/booking/centre-phone";
import { PaymentForm } from "@/features/booking/payment-form";
import { ReservationPaymentForm } from "@/features/booking/reservation-payment-form";
import { visitChanges } from "@/features/booking/visit-changes";
import { deadlineLabel } from "@/features/booking/visit-label";
import { visitSummaryItems } from "@/features/booking/visit-summary";
import { formatPrice } from "@/lib/format";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";

// Paying a reservation from its link (R11): the consents if the centre
// booked it, then Stripe's Payment Element for the session the server
// created. Reading the session is all this page does.

export const metadata: Metadata = {
  title: "Płatność za wizytę",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ReservationPaymentPage({
  params,
}: PageProps<"/wizyta/[token]/platnosc">) {
  const { token } = await params;
  const visit = await visitByLinkToken(token);
  if (!visit) notFound();
  const { booking, timeZone, policy } = visit;
  const back = `/wizyta/${token}` as Route;
  const { pay } = visitChanges(booking, policy);
  if (!pay.allowed || !pay.until) redirect(back);

  const sessionId = await pendingReservationPayment(
    createSecretClient(),
    token,
  );
  const session = sessionId
    ? await stripeServer()
        .checkout.sessions.retrieve(sessionId)
        .catch(() => null)
    : null;
  if (session?.status === "complete") {
    redirect(`${back}?sesja=${session.id}` as Route);
  }
  const open =
    session?.status === "open" && session.client_secret ? session : null;

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="grid gap-2">
        <h1 className="font-display text-display text-ink">
          Płatność za wizytę
        </h1>
        <p className="text-body text-text-muted max-w-2xl">
          Zapłać kartą, BLIK-iem lub przelewem do{" "}
          {deadlineLabel(pay.until, timeZone)}. Po opłaceniu od razu
          potwierdzimy wizytę.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          {open ? (
            <PaymentForm
              clientSecret={open.client_secret!}
              payLabel={`Zapłać ${formatPrice(booking)}`}
              phone={await centrePhone()}
            />
          ) : (
            <ReservationPaymentForm
              label={`Przejdź do płatności (${formatPrice(booking)})`}
              needsConsents={!booking.details}
              token={token}
            />
          )}
          <ArrowLink href={back}>Wróć do wizyty</ArrowLink>
        </div>
        <BookingSummary
          items={visitSummaryItems(booking, timeZone)}
          title={`Rezerwacja ${booking.reference}`}
        />
      </div>
    </div>
  );
}
