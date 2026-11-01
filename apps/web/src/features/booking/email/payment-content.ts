import type { ClaimedBookingEmail } from "@repo/supabase";
import { formatPrice } from "@/lib/format";
import { deadlineLabel, localTime, visitLabel } from "../visit-label";
import {
  contactLineOf,
  place,
  placeRows,
  type ConfirmationOptions,
  type VisitEmailContent,
} from "./confirmation-content";
import { visitIcs } from "./ics";

// What the e-mails about paying say (docs/product/booking-plan.md, R11):
// a reserved visit with the link to pay and the time to pay by, the two
// reminders before that time, the cancellation when it passes, and the
// reminder a day before a paid visit. Nothing is ever paid on site.

export type ReservationEmailKind =
  "reserved" | "payment_reminder" | "payment_last_call";

type Linked = ClaimedBookingEmail & { manageToken: string };

function calendarEvent(
  visit: ClaimedBookingEmail,
  url: string,
  cancelled = false,
) {
  return visitIcs({
    uid: `${visit.reference}@kolorsensu.pl`,
    startsAt: visit.startsAt,
    endsAt: visit.endsAt,
    summary: `${visit.serviceName} – Kolor Sensu`,
    location: place(visit),
    description: `Numer rezerwacji: ${visit.reference}\nSzczegóły: ${url}`,
    url,
    cancelled,
  });
}

function visitRows(
  visit: ClaimedBookingEmail,
  timeZone: string,
): [string, string][] {
  return [
    ["Usługa", visit.serviceName],
    ...(visit.specialistName
      ? [["Specjalista", visit.specialistName] as [string, string]]
      : []),
    [
      "Termin",
      `${visitLabel(visit.startsAt, timeZone)}–${localTime(visit.endsAt, timeZone)}`,
    ],
    ...placeRows(visit),
  ];
}

function plainText(
  content: Pick<
    VisitEmailContent,
    "greeting" | "intro" | "rows" | "manageUrl" | "buttonLabel" | "contactLine"
  >,
) {
  return [
    content.greeting,
    "",
    content.intro,
    "",
    ...content.rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `${content.buttonLabel}: ${content.manageUrl}`,
    ...(content.contactLine
      ? ["", `Masz pytania? Skontaktuj się z nami: ${content.contactLine}`]
      : []),
    "",
    "Kolor Sensu",
  ].join("\n");
}

const RESERVATION_COPY: Record<
  ReservationEmailKind,
  { heading: string; subject: (reference: string, due: string) => string }
> = {
  reserved: {
    heading: "Zarezerwowaliśmy Twoją wizytę",
    subject: (reference, due) =>
      `Rezerwacja wizyty ${reference} – opłać do ${due}`,
  },
  payment_reminder: {
    heading: "Przypominamy o płatności",
    subject: (reference, due) =>
      `Przypomnienie: opłać wizytę ${reference} do ${due}`,
  },
  payment_last_call: {
    heading: "Zostało kilka godzin na płatność",
    subject: (reference) => `Ostatnie godziny na opłacenie wizyty ${reference}`,
  },
};

/** A reserved visit, not paid yet: the link to pay and the time to pay by. */
export function reservationContent(
  kind: ReservationEmailKind,
  visit: Linked,
  { siteUrl, timeZone, contact }: ConfirmationOptions,
): VisitEmailContent {
  if (!visit.paymentDueAt)
    throw new Error("A reservation has a time to pay by");
  const due = deadlineLabel(visit.paymentDueAt, timeZone);
  const manageUrl = `${siteUrl}/wizyta/${visit.manageToken}`;
  // A client's own reservation is confirmed from this e-mail first; whoever
  // got it for a booking that is not theirs just leaves it (Klient · 9).
  const confirmBy =
    kind === "reserved" && visit.confirmBy
      ? deadlineLabel(visit.confirmBy, timeZone)
      : null;
  const rows: [string, string][] = [
    ...visitRows(visit, timeZone),
    ["Do zapłaty", formatPrice(visit)],
    ...(confirmBy ? [["Potwierdź do", confirmBy] as [string, string]] : []),
    ["Zapłać do", due],
    ["Numer rezerwacji", visit.reference],
  ];
  const greeting = `Dzień dobry, ${visit.clientName}!`;
  const intro = confirmBy
    ? `Dziękujemy za rezerwację wizyty w Kolor Sensu. Potwierdź ją przyciskiem poniżej do ${confirmBy}, a termin poczeka na Ciebie; bez potwierdzenia wróci do grafiku. Potem opłać wizytę online do ${due}. Jeśli to nie Ty rezerwujesz tę wizytę, nic nie rób: bez potwierdzenia rezerwacja przepadnie, a Ty nic nie zapłacisz.`
    : `${
        kind === "reserved"
          ? visit.bookedBy === "centre"
            ? "Zarezerwowaliśmy dla Ciebie wizytę w Kolor Sensu."
            : "Dziękujemy za rezerwację wizyty w Kolor Sensu."
          : "Twoja wizyta w Kolor Sensu nie jest jeszcze opłacona."
      } Opłać ją online do ${due}. Jeśli nie zapłacisz do tego czasu, anulujemy rezerwację, a termin wróci do grafiku.`;
  const contactLine = contactLineOf(contact);
  const buttonLabel = confirmBy ? "Potwierdź rezerwację" : "Zapłać za wizytę";
  const copy = RESERVATION_COPY[kind];
  return {
    subject: confirmBy
      ? `Potwierdź rezerwację wizyty ${visit.reference} do ${confirmBy}`
      : copy.subject(visit.reference, due),
    preview: `${visit.serviceName}, ${visitLabel(visit.startsAt, timeZone)} – ${
      confirmBy ? `potwierdź do ${confirmBy}` : `opłać do ${due}`
    }`,
    heading: confirmBy ? "Potwierdź swoją rezerwację" : copy.heading,
    greeting,
    intro,
    rows,
    manageUrl,
    buttonLabel,
    note: "W załączniku jest plik, który doda wizytę do Twojego kalendarza.",
    contactLine,
    text: plainText({
      greeting,
      intro,
      rows,
      manageUrl,
      buttonLabel,
      contactLine,
    }),
    ics: calendarEvent(visit, manageUrl),
  };
}

/** The reservation was not paid in time and is cancelled. */
export function unpaidCancelledContent(
  visit: ClaimedBookingEmail,
  { siteUrl, timeZone, contact }: ConfirmationOptions,
): VisitEmailContent {
  const manageUrl = `${siteUrl}/umow-wizyte`;
  const rows: [string, string][] = [
    ...visitRows(visit, timeZone).filter(
      ([label]) => label !== "Miejsce" && label !== "Dojazd",
    ),
    ["Numer rezerwacji", visit.reference],
  ];
  const greeting = `Dzień dobry, ${visit.clientName}!`;
  const intro =
    "Twoja rezerwacja nie została opłacona w wyznaczonym czasie, dlatego ją anulowaliśmy. Jeśli nadal chcesz przyjść, umów nowy termin.";
  const contactLine = contactLineOf(contact);
  const buttonLabel = "Umów nową wizytę";
  return {
    subject: `Rezerwacja ${visit.reference} anulowana – brak płatności`,
    preview: "Rezerwacja anulowana z powodu braku płatności",
    heading: "Anulowaliśmy rezerwację",
    greeting,
    intro,
    rows,
    manageUrl,
    buttonLabel,
    note: "W załączniku jest plik, który usunie wizytę z Twojego kalendarza.",
    contactLine,
    text: plainText({
      greeting,
      intro,
      rows,
      manageUrl,
      buttonLabel,
      contactLine,
    }),
    ics: calendarEvent(visit, manageUrl, true),
  };
}

/** A day before a paid visit. */
export function visitReminderContent(
  visit: Linked,
  { siteUrl, timeZone, contact }: ConfirmationOptions,
): VisitEmailContent {
  const when = visitLabel(visit.startsAt, timeZone);
  const manageUrl = `${siteUrl}/wizyta/${visit.manageToken}`;
  const rows: [string, string][] = [
    ...visitRows(visit, timeZone),
    ["Numer rezerwacji", visit.reference],
  ];
  const greeting = `Dzień dobry, ${visit.clientName}!`;
  const intro = "Przypominamy o Twojej wizycie w Kolor Sensu. Do zobaczenia!";
  const contactLine = contactLineOf(contact);
  const buttonLabel = "Zobacz swoją wizytę";
  return {
    subject: `Przypomnienie o wizycie – ${when}`,
    preview: `${visit.serviceName}, ${when}`,
    heading: "Przypominamy o wizycie",
    greeting,
    intro,
    rows,
    manageUrl,
    buttonLabel,
    note: null,
    contactLine,
    text: plainText({
      greeting,
      intro,
      rows,
      manageUrl,
      buttonLabel,
      contactLine,
    }),
    ics: calendarEvent(visit, manageUrl),
  };
}
