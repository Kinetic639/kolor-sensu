import { PrimaryButton, SecondaryButton } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { after } from "next/server";
import { RefreshWhileWaiting } from "@/features/booking/refresh-while-waiting";
import { sendWorkshopEmail } from "@/features/workshops/email/send";
import {
  WORKSHOP_METADATA_KEY,
  settleWorkshopSession,
} from "@/features/workshops/payment";
import { workshopPaymentDeps } from "@/features/workshops/payment-server";
import { readHeldSeat } from "@/features/workshops/seat-step";
import { workshopHref } from "@/features/workshops/workshop-view";
import { stripeServer } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Potwierdzenie zapisu na warsztat",
  robots: { index: false },
};

// Where Stripe returns the guest after paying for a seat (and where a free
// seat lands). The payment is settled here too (idempotently), since the
// webhook may come later; the seat's details show only to the browser
// holding its cookie (which lapses by itself; a confirmed seat is never
// given back by a new sign-up).
export default async function SeatConfirmationPage({
  searchParams,
}: PageProps<"/warsztaty/potwierdzenie">) {
  const { sesja, bezplatna } = await searchParams;
  const seat = await readHeldSeat();

  if (bezplatna === "1") {
    if (seat?.registration.status !== "confirmed")
      redirect("/warsztaty" as Route);
    return (
      <Message
        lead="Twoje miejsce jest potwierdzone; niczego nie pobraliśmy. Potwierdzenie z plikiem do kalendarza wyślemy na Twój adres e-mail."
        title="Miejsce potwierdzone"
        workshop={seat.registration}
      />
    );
  }

  const sessionId =
    typeof sesja === "string" && /^cs_/.test(sesja) ? sesja : null;
  if (!sessionId) redirect("/warsztaty" as Route);
  const session = await stripeServer()
    .checkout.sessions.retrieve(sessionId)
    .catch(() => null);
  const reference = session?.metadata?.[WORKSHOP_METADATA_KEY];
  if (!session || !reference) redirect("/warsztaty" as Route);
  const mine = seat?.registration.reference === reference ? seat : null;
  // Back from a payment that did not go through: try again.
  if (session.status === "open" && mine)
    redirect(`/warsztaty/${mine.registration.workshopSlug}/platnosc` as Route);

  const outcome =
    session.status === "complete"
      ? await settleWorkshopSession(session, {
          ...workshopPaymentDeps(),
          // The e-mail goes after the page is sent, not before.
          onConfirmed: async (ref) => {
            after(() => sendWorkshopEmail(ref, "confirmation"));
          },
        })
      : null;
  const confirmed = outcome === "confirmed" || outcome === "already_confirmed";

  if (confirmed)
    return (
      <Message
        lead="Dziękujemy! Płatność została przyjęta, a miejsce jest Twoje. Potwierdzenie z plikiem do kalendarza wyślemy na Twój adres e-mail."
        title="Miejsce potwierdzone"
        workshop={mine?.registration ?? null}
      />
    );
  if (outcome === "pending")
    return (
      <Message
        lead="Płatność jest w toku. Ta strona odświeży się sama, gdy bank ją potwierdzi; zwykle trwa to kilka chwil."
        title="Czekamy na potwierdzenie płatności"
        workshop={mine?.registration ?? null}
      >
        <RefreshWhileWaiting />
      </Message>
    );
  if (outcome === "seat_lost")
    return (
      <Message
        lead="Płatność dotarła po tym, jak ostatnie miejsce zajęła inna osoba. Zwróciliśmy pieniądze; możesz zapisać się na listę rezerwową."
        title="Miejsce zostało zajęte"
        workshop={mine?.registration ?? null}
      />
    );
  return (
    <Message
      lead="Nie pobraliśmy żadnej opłaty. Możesz spróbować ponownie."
      title="Płatność nie została zakończona"
      workshop={mine?.registration ?? null}
    />
  );
}

function Message({
  title,
  lead,
  workshop,
  children,
}: {
  title: string;
  lead: string;
  workshop: { workshopSlug: string; workshopTitle: string } | null;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 pt-8 lg:pt-12">
      <h1 className="font-display text-display text-ink">{title}</h1>
      <p className="text-body text-text-muted max-w-2xl">{lead}</p>
      {children}
      <div className="flex flex-wrap gap-3">
        {workshop ? (
          <SecondaryButton asChild>
            <Link href={workshopHref(workshop.workshopSlug)}>
              Wróć do warsztatu „{workshop.workshopTitle}”
            </Link>
          </SecondaryButton>
        ) : null}
        <PrimaryButton arrow asChild>
          <Link href="/warsztaty">Wszystkie warsztaty</Link>
        </PrimaryButton>
      </div>
    </div>
  );
}
