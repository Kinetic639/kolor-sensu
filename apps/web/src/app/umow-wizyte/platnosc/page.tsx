import { pendingCheckoutSession } from "@repo/supabase";
import { HoldNotice } from "@repo/ui/booking";
import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { releaseHoldAction } from "@/features/booking/actions";
import { BookingStep, requireLiveHold } from "@/features/booking/booking-step";
import { PaymentForm } from "@/features/booking/payment-form";
import { localTime } from "@/features/booking/visit-label";
import { formatPrice } from "@/lib/format";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";

export const metadata: Metadata = {
  title: "Płatność · Umów wizytę",
  robots: { index: false },
};

const DETAILS = "/umow-wizyte/dane" as Route;

// Step 5, paying: Stripe's Payment Element for the session the server
// created ("Zapisz dane" or "Przejdź do płatności"). Reading the session is
// all this page does; it never creates one.
export default async function BookingPaymentPage() {
  const visit = await requireLiveHold();
  const { booking, timeZone, token } = visit;
  if (!booking.details) redirect(DETAILS);

  const sessionId = await pendingCheckoutSession(createSecretClient(), token);
  const session = sessionId
    ? await stripeServer()
        .checkout.sessions.retrieve(sessionId)
        .catch(() => null)
    : null;
  if (session?.status === "complete") {
    redirect(`/umow-wizyte/potwierdzenie?sesja=${session.id}` as Route);
  }
  if (!session || session.status !== "open" || !session.client_secret) {
    redirect(DETAILS);
  }

  return (
    <BookingStep
      aside={
        <HoldNotice
          hint="Dokończ płatność przed tym czasem, a termin będzie Twój."
          until={localTime(booking.holdExpiresAt!, timeZone)}
        />
      }
      current={4}
      lead="Zapłać za wizytę kartą, BLIK-iem lub przelewem. Po opłaceniu od razu ją potwierdzimy."
      title="Płatność"
      visit={visit}
    >
      <PaymentForm
        clientSecret={session.client_secret}
        payLabel={`Zapłać ${formatPrice(booking)}`}
      />
      <div className="border-border/70 mt-8 flex flex-wrap gap-3 border-t pt-6">
        <SecondaryButton asChild size="sm">
          <Link href={DETAILS}>Zmień dane</Link>
        </SecondaryButton>
        <form action={releaseHoldAction}>
          <SecondaryButton size="sm" type="submit">
            Zmień termin
          </SecondaryButton>
        </form>
      </div>
    </BookingStep>
  );
}
