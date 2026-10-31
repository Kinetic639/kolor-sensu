import { pendingWorkshopCheckout } from "@repo/supabase/workshops";
import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { centrePhone } from "@/features/booking/centre-phone";
import { PaymentForm } from "@/features/booking/payment-form";
import { requireHeldSeat, SeatStep } from "@/features/workshops/seat-step";
import { seatDetailsPath } from "@/features/workshops/signup-paths";
import { formatPrice } from "@/lib/format";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";

export const metadata: Metadata = {
  title: "Płatność · Zapis na warsztat",
  robots: { index: false },
};

// Paying for the held seat: Stripe's Payment Element for the session the
// details step created. Reading the session is all this page does.
export default async function SeatPaymentPage({
  params,
}: PageProps<"/warsztaty/[slug]/platnosc">) {
  const { slug } = await params;
  const seat = await requireHeldSeat(slug);
  if (!seat.registration.details) redirect(seatDetailsPath(slug));

  const sessionId = await pendingWorkshopCheckout(
    createSecretClient(),
    seat.token,
  );
  const session = sessionId
    ? await stripeServer()
        .checkout.sessions.retrieve(sessionId)
        .catch(() => null)
    : null;
  if (session?.status === "complete") {
    redirect(`/warsztaty/potwierdzenie?sesja=${session.id}` as Route);
  }
  if (!session || session.status !== "open" || !session.client_secret) {
    redirect(seatDetailsPath(slug));
  }

  return (
    <SeatStep
      lead="Zapłać kartą, BLIK-iem lub przelewem. Po opłaceniu od razu potwierdzimy Twoje miejsce."
      seat={seat}
      title="Płatność"
    >
      <PaymentForm
        clientSecret={session.client_secret}
        payLabel={`Zapłać ${formatPrice(seat.registration)}`}
        phone={await centrePhone()}
      />
      <div className="border-border/70 border-t pt-6">
        <SecondaryButton asChild size="sm">
          <Link href={seatDetailsPath(slug)}>Zmień dane</Link>
        </SecondaryButton>
      </div>
    </SeatStep>
  );
}
