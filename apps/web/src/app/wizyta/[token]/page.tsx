import { BookingSummary } from "@repo/ui/booking";
import { SecondaryButton } from "@repo/ui/public-site";
import { CalendarDays, FileText, House, UserRound } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ContactDetails } from "@/components/contact-details";
import { visitByLinkToken } from "@/features/booking/guest-visit";
import { localTime, visitLabel } from "@/features/booking/visit-label";
import { formatPrice } from "@/lib/format";

// The page behind the confirmation e-mail's link: the visit, a calendar
// file, how to reach the centre. The address is a secret (the token), so
// it is never indexed and never sent on as a referrer.

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
  cancelled: {
    title: "Wizyta została odwołana",
    lead: "Jeśli to pomyłka albo chcesz umówić nowy termin, skontaktuj się z nami.",
  },
};

export default async function VisitPage({
  params,
}: PageProps<"/wizyta/[token]">) {
  const { token } = await params;
  const visit = await visitByLinkToken(token);
  if (!visit) notFound();
  const { booking, timeZone } = visit;
  const status = STATUS[booking.status] ?? {
    title: "Ta rezerwacja nie jest aktywna",
    lead: "Jeśli masz pytania, skontaktuj się z nami.",
  };

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="grid gap-2">
        <h1 className="font-display text-display text-ink">{status.title}</h1>
        <p className="text-body text-text-muted max-w-2xl">{status.lead}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <BookingSummary
          items={[
            {
              key: "usluga",
              icon: <FileText />,
              label: "Usługa",
              value: booking.serviceName,
              detail: formatPrice(booking),
            },
            {
              key: "specjalista",
              icon: <UserRound />,
              label: "Specjalista",
              value: booking.specialistName ?? undefined,
            },
            {
              key: "termin",
              icon: <CalendarDays />,
              label: "Termin",
              value: `${visitLabel(booking.startsAt, timeZone)}–${localTime(booking.endsAt, timeZone)}`,
            },
            {
              key: "forma",
              icon: <House />,
              label: "Miejsce",
              value:
                booking.mode === "online"
                  ? "Online"
                  : [booking.locationName, booking.roomName]
                      .filter(Boolean)
                      .join(" · ") || "Stacjonarnie",
            },
          ]}
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
        <div className="grid gap-3">
          <h2 className="text-title text-ink font-semibold">
            Chcesz coś zmienić?
          </h2>
          <p className="text-body text-text-muted">
            Aby przełożyć albo odwołać wizytę, skontaktuj się z nami i podaj
            numer rezerwacji.
          </p>
          <ContactDetails />
        </div>
      </div>
    </div>
  );
}
