import { getWorkshopRegistration } from "@repo/supabase/workshops";
import {
  PrimaryButton,
  SecondaryButton,
  SoftCard,
  WorkshopFacts,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deadlineLabel } from "@/features/booking/visit-label";
import { payReservedSeatAction } from "@/features/workshops/actions";
import { seatPrice } from "@/features/workshops/seat-step";
import {
  workshopDateLabel,
  workshopHref,
  workshopTimeLabel,
} from "@/features/workshops/workshop-view";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";

export const metadata: Metadata = {
  title: "Twój zapis na warsztat",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// A registration's page, by the link its e-mails carry (or the guest's
// own token): where it stands (confirmed, waiting for the payment with
// "Zapłać", on the waitlist), the workshop's facts, and once confirmed
// online, the meeting's link. Giving the seat up and passing it on come
// with the next part of the plan (PR 5).

const STATUS = {
  confirmed: "Miejsce potwierdzone",
  awaiting_payment: "Miejsce zarezerwowane, czeka na płatność",
  waitlisted: "Jesteś na liście rezerwowej",
  offered: "Zwolniło się miejsce dla Ciebie",
  held: "Zapis w toku",
  cancelled: "Zapis anulowany",
  expired: "Zapis wygasł",
} as const;

export default async function RegistrationPage({
  params,
  searchParams,
}: PageProps<"/warsztaty/zapis/[token]">) {
  const { token } = await params;
  const query = await searchParams;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();
  const [registration, window] = await Promise.all([
    getWorkshopRegistration(createSecretClient(), token).catch(() => null),
    getBookingWindow(),
  ]);
  if (!registration) notFound();
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const when = `${workshopDateLabel(registration.startsAt, timeZone)}, ${workshopTimeLabel(registration.startsAt, registration.endsAt, timeZone)}`;
  const place =
    registration.modality === "online"
      ? "Online"
      : [
          registration.locationName,
          registration.locationAddress,
          registration.roomName,
        ]
          .filter(Boolean)
          .join(", ");
  const payable =
    (registration.status === "awaiting_payment" ||
      registration.status === "offered") &&
    registration.priceMinor > 0;
  const due =
    registration.status === "offered"
      ? registration.offerExpiresAt
      : registration.paymentDueAt;

  const lead =
    query.zarezerwowano === "1"
      ? "Wysłaliśmy Ci e-mail z tym linkiem. Opłać miejsce w terminie, a będzie Twoje."
      : query.lista === "1"
        ? "Wysłaliśmy Ci e-mail z tym linkiem. Gdy zwolni się miejsce, napiszemy."
        : registration.status === "confirmed"
          ? "Do zobaczenia na warsztacie. Potwierdzenie z plikiem do kalendarza jest w Twoim e-mailu."
          : null;

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pt-12">
      <div className="grid content-start gap-6">
        <p className="text-eyebrow text-primary-strong uppercase">
          Zapis {registration.reference}
        </p>
        <h1 className="font-display text-display text-ink">
          {STATUS[registration.status]}
        </h1>
        {lead ? (
          <p className="text-body text-text-muted max-w-2xl">{lead}</p>
        ) : null}
        {query.platnosc === "niedostepna" ? (
          <p
            className="rounded-card-sm bg-pink-soft text-small text-ink p-4"
            role="alert"
          >
            Nie da się już opłacić tego miejsca. Jeśli to pomyłka, zadzwoń do
            nas.
          </p>
        ) : null}

        {payable && due ? (
          <SoftCard className="grid gap-4 p-6" tone="cream">
            <p className="text-body text-ink">
              Do zapłaty: <strong>{seatPrice(registration)}</strong>, do{" "}
              {deadlineLabel(due, timeZone)}. Bez wpłaty miejsce się zwolni.
            </p>
            <form action={payReservedSeatAction}>
              <input name="token" type="hidden" value={token} />
              <PrimaryButton arrow type="submit">
                Zapłać teraz
              </PrimaryButton>
            </form>
          </SoftCard>
        ) : null}

        {registration.status === "waitlisted" &&
        registration.waitlistPosition ? (
          <p className="text-body text-ink">
            Twoje miejsce na liście:{" "}
            <strong>{registration.waitlistPosition}</strong>. Gdy zwolni się
            miejsce, będziesz mieć 24 godziny na zapłatę.
          </p>
        ) : null}

        {registration.meetingUrl ? (
          <p className="text-body text-ink">
            Link do spotkania:{" "}
            <a
              className="text-primary-strong font-semibold underline"
              href={registration.meetingUrl}
              rel="noreferrer"
              target="_blank"
            >
              {registration.meetingUrl}
            </a>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <SecondaryButton asChild>
            <Link href={workshopHref(registration.workshopSlug)}>
              O warsztacie
            </Link>
          </SecondaryButton>
        </div>
        <p className="text-small text-text-muted">
          Chcesz zrezygnować albo przekazać miejsce innej osobie? Zadzwoń lub
          napisz do nas;{" "}
          <Link className="underline" href="/kontakt">
            kontakt
          </Link>
          . Pełny zwrot przy rezygnacji do{" "}
          {deadlineLabel(registration.fullRefundUntil, timeZone)}.
        </p>
      </div>

      <SoftCard className="grid content-start gap-4 p-6" tone="cream">
        <p className="font-display text-h3 text-ink">
          {registration.workshopTitle}
        </p>
        <WorkshopFacts
          facts={[
            { icon: "date", label: "Termin", value: when },
            { icon: "place", label: "Miejsce", value: place || "Stacjonarnie" },
          ]}
        />
        {registration.details ? (
          <p className="text-small text-text-muted">
            Uczestnik: {registration.details.name}, {registration.details.email}
          </p>
        ) : null}
      </SoftCard>
    </div>
  );
}
