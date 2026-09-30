import { addDays, toFreeSlots } from "@repo/scheduling";
import { listRescheduleSlots } from "@repo/supabase";
import { BookingSummary, SlotPicker } from "@repo/ui/booking";
import { ArrowLink } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ChangeVisitForm } from "@/features/booking/change-visit-form";
import { visitByLinkToken } from "@/features/booking/guest-visit";
import { centreToday } from "@/features/booking/load-wizard";
import {
  buildRescheduleView,
  loadRescheduleParams,
  rescheduleWeek,
} from "@/features/booking/reschedule-view";
import { visitChanges } from "@/features/booking/visit-changes";
import { visitSummaryItems } from "@/features/booking/visit-summary";
import { createSecretClient } from "@/lib/supabase/secret";

// Moving a visit (R8): the same specialist, service and form, the price
// unchanged; the free times of a week, then a confirmation. Free times are
// read fresh on every request.

export const metadata: Metadata = {
  title: "Przełożenie wizyty",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RescheduleVisitPage({
  params,
  searchParams,
}: PageProps<"/wizyta/[token]/przeloz">) {
  const { token } = await params;
  const visit = await visitByLinkToken(token);
  if (!visit) notFound();
  const { booking, timeZone, horizonDays, policy } = visit;
  const { reschedule } = visitChanges(booking, policy);
  const back = `/wizyta/${token}` as Route;

  if (!reschedule.allowed) {
    return (
      <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 pt-8 lg:pt-12">
        <h1 className="font-display text-display text-ink">
          Tej wizyty nie można przełożyć samodzielnie
        </h1>
        <p className="text-body text-text-muted max-w-2xl">
          Aby zmienić termin, skontaktuj się z nami i podaj numer rezerwacji{" "}
          {booking.reference}.
        </p>
        <ArrowLink href={back}>Wróć do wizyty</ArrowLink>
      </div>
    );
  }

  const query = loadRescheduleParams(await searchParams);
  const today = centreToday(timeZone);
  const week = rescheduleWeek(query, today);
  const rows = await listRescheduleSlots(createSecretClient(), token, {
    from: week,
    to: addDays(week, 6),
  }).catch((error) => {
    console.error("[booking] times to move to failed:", error);
    return [];
  });
  const view = buildRescheduleView({
    token,
    params: query,
    today,
    horizonDays,
    slots: toFreeSlots(rows, timeZone),
  });

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="grid gap-2">
        <h1 className="font-display text-display text-ink">
          Wybierz nowy termin
        </h1>
        <p className="text-body text-text-muted max-w-2xl">
          Ten sam specjalista, usługa i forma wizyty; cena się nie zmienia.
          {reschedule.remaining === 1
            ? " Samodzielnie możesz przełożyć wizytę jeden raz; kolejne zmiany ustalisz z centrum."
            : null}
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <SlotPicker {...view.picker} />
          {view.chosen ? (
            <section
              aria-labelledby="nowy-termin"
              className="rounded-card-sm border-border bg-surface grid gap-4 border p-5"
            >
              <h2
                className="text-title text-ink font-semibold"
                id="nowy-termin"
              >
                Nowy termin: {view.chosen.label}
              </h2>
              <ChangeVisitForm
                change="reschedule"
                label="Przełóż na ten termin"
                termin={view.chosen.value}
                token={token}
              />
            </section>
          ) : null}
        </div>
        <div className="grid gap-4">
          <BookingSummary
            items={visitSummaryItems(booking, timeZone)}
            title="Obecny termin"
          />
          <ArrowLink href={back}>Wróć do wizyty</ArrowLink>
        </div>
      </div>
    </div>
  );
}
