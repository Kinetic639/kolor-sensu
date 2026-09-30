import { BookingSummary } from "@repo/ui/booking";
import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactDetails } from "@/components/contact-details";
import { visitByLinkToken } from "@/features/booking/guest-visit";
import {
  visitPageCopy,
  type VisitChangeDone,
} from "@/features/booking/visit-page-copy";
import { visitSummaryItems } from "@/features/booking/visit-summary";

// The page behind the visit e-mails' link: the visit, a calendar file, and
// what the client may still change themselves (R8): move it or cancel it,
// by the centre's rules; anything else through the centre. The address is
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
  cancelled: {
    title: "Wizyta została odwołana",
    lead: "Jeśli chcesz umówić nowy termin, zapraszamy ponownie.",
  },
};

const CHANGES: VisitChangeDone[] = ["przelozona", "odwolana"];

export default async function VisitPage({
  params,
  searchParams,
}: PageProps<"/wizyta/[token]">) {
  const { token } = await params;
  const { zmiana } = await searchParams;
  const visit = await visitByLinkToken(token);
  if (!visit) notFound();
  const { booking, timeZone, policy } = visit;
  const status = STATUS[booking.status] ?? {
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
