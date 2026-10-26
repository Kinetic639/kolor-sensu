// A visit link that no longer opens the visit (#259): every e-mail to the
// client gives the visit a new link, so an older e-mail's link, or Stripe's
// return to the link a payment was begun from, finds nothing. Instead of
// "this page does not exist": what became of the payment just made, if
// any (its settlement's outcome), else where the current link is.

export interface StaleLinkView {
  title: string;
  lead: string;
}

const PAID: StaleLinkView = {
  title: "Płatność przyjęta",
  lead: "Dziękujemy! Wizyta jest opłacona i potwierdzona. Potwierdzenie z aktualnym linkiem do wizyty wysłaliśmy e-mailem.",
};

const VIEWS: Record<string, StaleLinkView> = {
  confirmed: PAID,
  already_confirmed: PAID,
  awaiting_payment: {
    title: "Czekamy na potwierdzenie płatności",
    lead: "Płatność jest w toku. Gdy bank ją potwierdzi, wyślemy e-mail z potwierdzeniem i aktualnym linkiem do wizyty.",
  },
  slot_lost: {
    title: "Zwróciliśmy tę płatność",
    lead: "Termin nie był już dostępny, więc pieniądze wróciły w całości. Szczegóły wysłaliśmy e-mailem.",
  },
  refund_payment: {
    title: "Zwróciliśmy tę płatność",
    lead: "Ta wizyta była już opłacona albo jej cena się zmieniła, więc tę płatność oddaliśmy w całości. Szczegóły wysłaliśmy e-mailem.",
  },
};

const STALE: StaleLinkView = {
  title: "Ten link jest już nieaktualny",
  lead: "Wysłaliśmy Ci nowszą wiadomość o tej wizycie. Użyj linku z najnowszego e-maila od nas, a jeśli go nie masz, skontaktuj się z nami.",
};

/** The page for a link that finds no visit, by the payment's outcome. */
export function staleLinkView(outcome: string | null): StaleLinkView {
  return (outcome && VIEWS[outcome]) || STALE;
}
