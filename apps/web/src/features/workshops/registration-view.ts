import type { WorkshopRegistration } from "@repo/supabase/workshops";
import { deadlineLabel } from "@/features/booking/visit-label";
import { formatPrice } from "@/lib/format";

// What a registration's page offers (docs/product/workshops-plan.md, PR 5):
// whether the seat can be given up and what then happens to the money,
// whether it can be passed on, and what the page says after a change.
// Pure, so it is tested without a database.

export interface SeatChoices {
  cancel: { label: string; consequence: string } | null;
  transfer: boolean;
}

export function seatChoices(
  registration: WorkshopRegistration,
  now: Date,
  timeZone: string,
): SeatChoices {
  const started = new Date(registration.startsAt).getTime() <= now.getTime();
  const active = ["confirmed", "awaiting_payment", "waitlisted", "offered"];
  if (
    started ||
    registration.workshopStatus !== "published" ||
    !active.includes(registration.status)
  )
    return { cancel: null, transfer: false };

  const paid = registration.paidMinor - registration.refundedMinor;
  const money = formatPrice({
    priceMinor: paid,
    currencyCode: registration.currencyCode,
  });
  const fullRefund =
    registration.refundAnyTime ||
    now.getTime() < new Date(registration.fullRefundUntil).getTime();
  const consequence =
    registration.status === "waitlisted"
      ? "Zrezygnujesz z miejsca na liście rezerwowej."
      : registration.status !== "confirmed" ||
          paid <= 0 ||
          registration.paidOutside
        ? registration.paidOutside && paid <= 0
          ? "Miejsce się zwolni. Wpłatę rozliczymy z Tobą bezpośrednio."
          : "Miejsce się zwolni; nic nie zostało pobrane."
        : fullRefund
          ? `Miejsce się zwolni, a my oddamy całe ${money}.`
          : `Do warsztatu został mniej niż tydzień, więc oddamy ${money} tylko wtedy, gdy Twoje miejsce zajmie ktoś z listy rezerwowej. Możesz też przekazać miejsce innej osobie.`;

  return {
    cancel: {
      label:
        registration.status === "waitlisted"
          ? "Wypisz się z listy rezerwowej"
          : "Zrezygnuj z warsztatu",
      consequence,
    },
    transfer:
      registration.status === "confirmed" ||
      registration.status === "awaiting_payment",
  };
}

/** The rule said under the choices: until when the refund is full. */
export function refundRule(
  registration: WorkshopRegistration,
  timeZone: string,
) {
  if (registration.refundAnyTime)
    return "Termin warsztatu się zmienił, więc przy rezygnacji oddamy całą wpłatę w każdej chwili przed warsztatem.";
  return `Pełny zwrot przy rezygnacji do ${deadlineLabel(registration.fullRefundUntil, timeZone)}.`;
}

/** What the page says after a change (`?zmiana=…`). */
export const CHANGE_NOTICES: Record<string, string> = {
  anulowany:
    "Zapis anulowany. Wysłaliśmy Ci e-mail z potwierdzeniem; jeśli należy się zwrot, pieniądze wrócą w kilka dni roboczych.",
  "zwrot-pozniej":
    "Zapis anulowany. Zwrot zrobimy w ciągu kilkunastu minut; napiszemy, gdy pieniądze wyjdą.",
  przekazany: "Miejsce przekazane. Nowa osoba dostała e-mail z potwierdzeniem.",
  "za-pozno": "Warsztat już się zaczął, więc nie można zrezygnować.",
  niedostepna: "Tej zmiany nie da się już zrobić.",
};
