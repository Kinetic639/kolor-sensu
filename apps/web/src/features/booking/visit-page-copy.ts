import type { GuestBooking } from "@repo/supabase";
import type { Route } from "next";
import { formatPrice } from "@/lib/format";
import { deadlineLabel } from "./visit-label";
import { visitChanges, type ChangePolicy } from "./visit-changes";

// What the visit's page says about changing it (docs/product/booking-plan.md,
// R8): what the client may still do themselves, until when, and what
// happens with the money. Pure, so every case is tested.

export type VisitChangeDone =
  "przelozona" | "odwolana" | "potwierdzona" | "oplacona";

export interface VisitPageCopy {
  /** What just changed (after a move or a cancellation). */
  notice: string | null;
  /** A cancelled visit: what happens with the money. */
  cancelledLead: string | null;
  /** A reservation not paid yet: pay it by its time. */
  pay: { text: string; href: Route } | null;
  /** Null: nothing to change (past, cancelled, not paid yet). */
  reschedule: { text: string; href: Route | null } | null;
  cancel: { text: string; href: Route } | null;
}

const NOTICES: Record<VisitChangeDone, string> = {
  przelozona: "Wizyta została przełożona. Wysłaliśmy e-mail z nowym terminem.",
  odwolana: "Wizyta została odwołana. Wysłaliśmy potwierdzenie e-mailem.",
  potwierdzona:
    "Rezerwacja potwierdzona. Termin czeka na Ciebie do czasu płatności.",
  // The link to pay, opened again after paying (Klient · 5, card 10).
  oplacona: "Ta wizyta jest już opłacona. Nie musisz płacić ponownie.",
};

export function visitPageCopy({
  token,
  booking,
  policy,
  timeZone,
  now = new Date(),
  change,
}: {
  token: string;
  booking: Pick<
    GuestBooking,
    | "status"
    | "startsAt"
    | "rescheduleCount"
    | "priceMinor"
    | "currencyCode"
    | "cancelledBy"
    | "refundDueMinor"
    | "refundedMinor"
    | "paid"
    | "paymentDueAt"
  >;
  policy: ChangePolicy;
  timeZone: string;
  now?: Date;
  change?: VisitChangeDone | null;
}): VisitPageCopy {
  const changes = visitChanges(booking, policy, now);
  const money = (minor: number) =>
    formatPrice({ priceMinor: minor, currencyCode: booking.currencyCode });

  let cancelledLead: string | null = null;
  if (booking.status === "cancelled" && booking.cancelledBy === "system") {
    cancelledLead =
      "Rezerwacja została anulowana, bo nie została opłacona w wyznaczonym czasie. Jeśli chcesz przyjść, umów nowy termin.";
  } else if (
    booking.status === "cancelled" &&
    booking.paymentDueAt !== null &&
    !booking.paid
  ) {
    cancelledLead = "Rezerwacja została odwołana.";
  } else if (
    booking.status === "cancelled" &&
    booking.refundDueMinor !== null
  ) {
    const due = booking.refundDueMinor;
    cancelledLead =
      due === 0
        ? booking.paid
          ? "Wizyta została odwołana bez zwrotu opłaty."
          : "Wizyta została odwołana."
        : booking.refundedMinor >= due
          ? `Zleciliśmy zwrot ${money(due)} tą samą metodą, którą zapłacono. Pieniądze zwykle wracają w ciągu kilku dni roboczych.`
          : `Zwrot ${money(due)} zleci centrum. Pieniądze zwykle wracają w ciągu kilku dni roboczych.`;
  }

  const { pay, reschedule, cancel } = changes;
  const payCopy =
    pay.allowed && pay.until
      ? {
          text: `Opłać wizytę online do ${deadlineLabel(pay.until, timeZone)}. Jeśli nie zapłacisz do tego czasu, rezerwacja zostanie anulowana.`,
          href: `/wizyta/${token}/platnosc` as Route,
        }
      : null;
  const rescheduleCopy =
    reschedule.blockedBy === "status"
      ? null
      : reschedule.allowed
        ? {
            text: `Możesz samodzielnie przełożyć wizytę do ${deadlineLabel(reschedule.until, timeZone)}. ${
              reschedule.remaining === 1
                ? "Zrobisz to jeden raz; kolejne zmiany ustalisz z centrum."
                : `Możesz to zrobić jeszcze ${reschedule.remaining} razy.`
            }`,
            href: `/wizyta/${token}/przeloz` as Route,
          }
        : {
            text:
              reschedule.blockedBy === "window"
                ? `Na mniej niż ${policy.rescheduleWindowHours} godz. przed wizytą termin można zmienić tylko po kontakcie z centrum.`
                : policy.maxSelfReschedules === 0
                  ? "Zmianę terminu ustalisz, kontaktując się z centrum."
                  : "Wizyta była już przekładana. Kolejną zmianę terminu ustalisz, kontaktując się z centrum.",
            href: null,
          };

  const cancelCopy = cancel.allowed
    ? {
        text: pay.allowed
          ? "Jeśli nie możesz przyjść, odwołaj rezerwację. Nie jest opłacona, więc nie ma nic do zwrotu."
          : cancel.refund
            ? `Odwołując wizytę do ${deadlineLabel(cancel.refundUntil, timeZone)}, otrzymasz pełny zwrot (${money(booking.priceMinor)}). Później odwołanie jest możliwe już bez zwrotu.`
            : booking.paid && booking.priceMinor > 0
              ? `Do wizyty zostało mniej niż ${policy.cancellationWindowHours} godz., więc odwołanie jest możliwe już bez zwrotu opłaty.`
              : "Możesz odwołać wizytę, jeśli nie możesz przyjść.",
        href: `/wizyta/${token}/odwolaj` as Route,
      }
    : null;

  return {
    notice: change ? NOTICES[change] : null,
    cancelledLead,
    pay: payCopy,
    reschedule: rescheduleCopy,
    cancel: cancelCopy,
  };
}
