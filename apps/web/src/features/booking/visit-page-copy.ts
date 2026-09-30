import type { GuestBooking } from "@repo/supabase";
import type { Route } from "next";
import { formatPrice } from "@/lib/format";
import { deadlineLabel } from "./visit-label";
import { visitChanges, type ChangePolicy } from "./visit-changes";

// What the visit's page says about changing it (docs/product/booking-plan.md,
// R8): what the client may still do themselves, until when, and what
// happens with the money. Pure, so every case is tested.

export type VisitChangeDone = "przelozona" | "odwolana";

export interface VisitPageCopy {
  /** What just changed (after a move or a cancellation). */
  notice: string | null;
  /** A cancelled visit: what happens with the money. */
  cancelledLead: string | null;
  /** Null: nothing to change (past, cancelled, unpaid). */
  reschedule: { text: string; href: Route | null } | null;
  cancel: { text: string; href: Route } | null;
}

const NOTICES: Record<VisitChangeDone, string> = {
  przelozona: "Wizyta została przełożona. Wysłaliśmy e-mail z nowym terminem.",
  odwolana: "Wizyta została odwołana. Wysłaliśmy potwierdzenie e-mailem.",
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
  if (booking.status === "cancelled" && booking.refundDueMinor !== null) {
    const due = booking.refundDueMinor;
    cancelledLead =
      due === 0
        ? "Wizyta została odwołana bez zwrotu opłaty."
        : booking.refundedMinor >= due
          ? `Zleciliśmy zwrot ${money(due)} tą samą metodą, którą zapłacono. Pieniądze zwykle wracają w ciągu kilku dni roboczych.`
          : `Zwrot ${money(due)} zleci centrum. Pieniądze zwykle wracają w ciągu kilku dni roboczych.`;
  }

  const { reschedule, cancel } = changes;
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
        text: cancel.refund
          ? `Odwołując wizytę do ${deadlineLabel(cancel.refundUntil, timeZone)}, otrzymasz pełny zwrot (${money(booking.priceMinor)}). Później odwołanie jest możliwe już bez zwrotu.`
          : booking.priceMinor > 0
            ? `Do wizyty zostało mniej niż ${policy.cancellationWindowHours} godz., więc odwołanie jest możliwe już bez zwrotu opłaty.`
            : "Możesz odwołać wizytę, jeśli nie możesz przyjść.",
        href: `/wizyta/${token}/odwolaj` as Route,
      }
    : null;

  return {
    notice: change ? NOTICES[change] : null,
    cancelledLead,
    reschedule: rescheduleCopy,
    cancel: cancelCopy,
  };
}
