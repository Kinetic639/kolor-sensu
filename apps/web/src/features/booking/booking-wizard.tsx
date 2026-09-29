import {
  BookingChoiceCard,
  BookingStepper,
  BookingSummary,
  SlotPicker,
} from "@repo/ui/booking";
import { PrimaryButton } from "@repo/ui/public-site";
import { CalendarDays, FileText, House, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { holdTimeAction } from "./actions";
import type { BookingNotice, BookingParams } from "./search-params";
import type { WizardSummaryRow, WizardView } from "./wizard";

// The booking wizard's page body: the steps, the current step's choices
// and the summary. Rendered on the server; every choice is a link. Only the
// last action (holding the chosen time) is a form, posted to the server.

const ICONS: Record<WizardSummaryRow["key"], ReactNode> = {
  usluga: <FileText />,
  forma: <House />,
  specjalista: <UserRound />,
  termin: <CalendarDays />,
};

const NOTICES: Record<BookingNotice, string> = {
  "termin-zajety":
    "Ten termin został właśnie zajęty. Wybierz, proszę, inny wolny termin.",
  "rezerwacja-wygasla":
    "Czas na dokończenie rezerwacji minął i termin został zwolniony. Wybierz termin ponownie.",
};

export function BookingWizard({
  view,
  params,
}: {
  view: WizardView;
  params: BookingParams;
}) {
  const { panel } = view;
  const chosen = panel.kind === "slots" ? panel.chosen : null;

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-display text-ink">Umów spotkanie</h1>
        <BookingStepper
          className="w-full max-w-2xl"
          current={view.stepIndex}
          steps={view.steps}
        />
      </div>

      {params.uwaga ? (
        <p
          className="rounded-card-sm bg-pink-soft text-small text-ink p-4"
          role="alert"
        >
          {NOTICES[params.uwaga]}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="booking-step-heading"
          className="rounded-card border-border/70 bg-surface shadow-card border p-5 sm:p-6"
        >
          <h2
            className="font-display text-h3 text-ink"
            id="booking-step-heading"
          >
            {panel.title}
          </h2>
          <p className="text-small text-text-muted mt-1 mb-5">{panel.lead}</p>
          {panel.kind === "choices" ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {panel.cards.map((card) => (
                <BookingChoiceCard
                  description={card.description}
                  facts={card.facts}
                  href={card.href}
                  key={card.key}
                  media={
                    card.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL
                      <img
                        alt=""
                        className="size-full object-cover"
                        src={card.photoUrl}
                      />
                    ) : undefined
                  }
                  selected={card.selected}
                  subtitle={card.subtitle}
                  tags={card.tags}
                  title={card.title}
                />
              ))}
            </ul>
          ) : (
            <SlotPicker {...panel.picker} />
          )}
        </section>

        <BookingSummary
          items={view.summary.map((row) => ({
            ...row,
            icon: ICONS[row.key],
          }))}
        >
          {chosen ? (
            <form action={holdTimeAction}>
              {Object.entries(params).map(([key, value]) =>
                value && key !== "uwaga" ? (
                  <input key={key} name={key} type="hidden" value={value} />
                ) : null,
              )}
              <PrimaryButton arrow className="w-full" type="submit">
                Przejdź dalej
              </PrimaryButton>
            </form>
          ) : (
            <p className="text-small text-text-muted">
              Jeśli nie widzisz dogodnego terminu, zadzwoń lub napisz do nas.
            </p>
          )}
        </BookingSummary>
      </div>
    </div>
  );
}
