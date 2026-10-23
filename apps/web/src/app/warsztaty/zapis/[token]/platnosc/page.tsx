import {
  getWorkshopRegistration,
  pendingWorkshopCheckout,
} from "@repo/supabase/workshops";
import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PaymentForm } from "@/features/booking/payment-form";
import { formatPrice } from "@/lib/format";
import { stripeServer } from "@/lib/stripe";
import { createSecretClient } from "@/lib/supabase/secret";

export const metadata: Metadata = {
  title: "Płatność za warsztat",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// Paying for a reserved (or offered) seat from its e-mailed link: Stripe's
// Payment Element for the session "Zapłać teraz" created.
export default async function ReservedSeatPaymentPage({
  params,
}: PageProps<"/warsztaty/zapis/[token]/platnosc">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();
  const db = createSecretClient();
  const registration = await getWorkshopRegistration(db, token).catch(
    () => null,
  );
  if (!registration) notFound();
  const page = `/warsztaty/zapis/${token}` as Route;

  const sessionId = await pendingWorkshopCheckout(db, token);
  const session = sessionId
    ? await stripeServer()
        .checkout.sessions.retrieve(sessionId)
        .catch(() => null)
    : null;
  if (session?.status === "complete") {
    redirect(`/warsztaty/potwierdzenie?sesja=${session.id}` as Route);
  }
  if (!session || session.status !== "open" || !session.client_secret) {
    redirect(page);
  }

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid max-w-2xl gap-6 pt-8 lg:pt-12">
      <h1 className="font-display text-display text-ink">Płatność</h1>
      <p className="text-body text-text-muted">
        {registration.workshopTitle}: zapłać kartą, BLIK-iem lub przelewem. Po
        opłaceniu od razu potwierdzimy Twoje miejsce.
      </p>
      <PaymentForm
        clientSecret={session.client_secret}
        payLabel={`Zapłać ${formatPrice(registration)}`}
      />
      <div>
        <SecondaryButton asChild size="sm">
          <Link href={page}>Wróć do zapisu</Link>
        </SecondaryButton>
      </div>
    </div>
  );
}
