import { BookingSummary } from "@repo/ui/booking";
import { ArrowLink } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ChangeVisitForm } from "@/features/booking/change-visit-form";
import { visitByLinkToken } from "@/features/booking/guest-visit";
import { visitChanges } from "@/features/booking/visit-changes";
import { visitSummaryItems } from "@/features/booking/visit-summary";
import { formatPrice } from "@/lib/format";

// Cancelling a visit (R8): what it means for the money, said before the
// client confirms. The database decides again when they do.

export const metadata: Metadata = {
  title: "Odwołanie wizyty",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CancelVisitPage({
  params,
}: PageProps<"/wizyta/[token]/odwolaj">) {
  const { token } = await params;
  const visit = await visitByLinkToken(token);
  if (!visit) notFound();
  const { booking, timeZone, policy } = visit;
  const { cancel } = visitChanges(booking, policy);
  const back = `/wizyta/${token}` as Route;

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="grid gap-2">
        <h1 className="font-display text-display text-ink">
          {cancel.allowed ? "Odwołać wizytę?" : "Tej wizyty nie można odwołać"}
        </h1>
        <p className="text-body text-text-muted max-w-2xl">
          {cancel.allowed
            ? "Sprawdź szczegóły i potwierdź. Zwolniony termin od razu wróci do puli wolnych terminów."
            : "Wizyta jest już odwołana albo minęła. Jeśli masz pytania, skontaktuj się z nami."}
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <BookingSummary
          items={visitSummaryItems(booking, timeZone)}
          title={`Rezerwacja ${booking.reference}`}
        />
        <div className="grid gap-5">
          {cancel.allowed ? (
            <>
              <p
                className={
                  cancel.refund
                    ? "rounded-card-sm bg-primary-soft text-small text-ink p-4"
                    : "rounded-card-sm bg-pink-soft text-small text-ink p-4"
                }
              >
                {cancel.refund
                  ? `Otrzymasz pełny zwrot: ${formatPrice(booking)}, tą samą metodą, którą zapłacono.`
                  : !booking.paid && booking.priceMinor > 0
                    ? "Rezerwacja nie jest opłacona, więc nie ma nic do zwrotu."
                    : booking.priceMinor > 0
                      ? `Do wizyty zostało mniej niż ${policy.cancellationWindowHours} godz., więc opłata nie zostanie zwrócona. Jeśli wolisz zmienić termin, skontaktuj się z nami.`
                      : "Wizyta była bezpłatna, więc nie ma nic do zwrotu."}
              </p>
              <ChangeVisitForm
                change="cancel"
                label="Tak, odwołuję wizytę"
                token={token}
              />
            </>
          ) : null}
          <ArrowLink href={back}>Wróć do wizyty</ArrowLink>
        </div>
      </div>
    </div>
  );
}
