import type { ClaimedBookingEmail } from "@repo/supabase";
import { formatPrice } from "@/lib/format";
import { localTime, visitLabel } from "../visit-label";
import {
  contactLineOf,
  place,
  type ConfirmationOptions,
  type VisitEmailContent,
} from "./confirmation-content";
import { visitIcs } from "./ics";

// What the e-mails about a change say (docs/product/booking-plan.md, R8):
// the visit's new time, or its cancellation and what is given back. They
// carry the link the client already uses, and a calendar file that updates
// (or cancels) the same event as the confirmation's.

export interface ChangeOptions extends ConfirmationOptions {
  /** The link token the client used; the e-mail links to the same page. */
  manageToken: string;
  /** The calendar event's version: how many times the visit has changed. */
  sequence: number;
}

function frame(
  visit: ClaimedBookingEmail,
  { siteUrl, timeZone, contact, manageToken, sequence }: ChangeOptions,
  cancelled: boolean,
) {
  const manageUrl = `${siteUrl}/wizyta/${manageToken}`;
  return {
    when: visitLabel(visit.startsAt, timeZone),
    span: `${visitLabel(visit.startsAt, timeZone)}–${localTime(visit.endsAt, timeZone)}`,
    manageUrl,
    greeting: `Dzień dobry, ${visit.clientName}!`,
    contactLine: contactLineOf(contact),
    ics: visitIcs({
      uid: `${visit.reference}@kolorsensu.pl`,
      startsAt: visit.startsAt,
      endsAt: visit.endsAt,
      summary: `${visit.serviceName} – Kolor Sensu`,
      location: place(visit),
      description: `Numer rezerwacji: ${visit.reference}\nSzczegóły: ${manageUrl}`,
      url: manageUrl,
      sequence,
      cancelled,
    }),
  };
}

function plainText(
  content: Pick<
    VisitEmailContent,
    "greeting" | "intro" | "rows" | "manageUrl" | "contactLine"
  >,
) {
  return [
    content.greeting,
    "",
    content.intro,
    "",
    ...content.rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Szczegóły wizyty: ${content.manageUrl}`,
    ...(content.contactLine
      ? ["", `Masz pytania? Skontaktuj się z nami: ${content.contactLine}`]
      : []),
    "",
    "Kolor Sensu",
  ].join("\n");
}

export function rescheduledContent(
  visit: ClaimedBookingEmail,
  options: ChangeOptions,
): VisitEmailContent {
  const { when, span, manageUrl, greeting, contactLine, ics } = frame(
    visit,
    options,
    false,
  );
  const rows: [string, string][] = [
    ["Usługa", visit.serviceName],
    ...(visit.specialistName
      ? [["Specjalista", visit.specialistName] as [string, string]]
      : []),
    ["Nowy termin", span],
    ["Miejsce", place(visit)],
    ["Numer rezerwacji", visit.reference],
  ];
  const intro = "Twoja wizyta została przełożona na nowy termin.";
  return {
    subject: `Nowy termin wizyty ${visit.reference} – ${when}`,
    preview: `${visit.serviceName}, ${when}`,
    heading: "Twoja wizyta ma nowy termin",
    greeting,
    intro,
    rows,
    manageUrl,
    buttonLabel: "Zobacz swoją wizytę",
    note: "W załączniku jest plik, który przeniesie wizytę w Twoim kalendarzu na nowy termin.",
    contactLine,
    text: plainText({ greeting, intro, rows, manageUrl, contactLine }),
    ics,
  };
}

export function cancelledContent(
  visit: ClaimedBookingEmail,
  options: ChangeOptions & { refundMinor: number },
): VisitEmailContent {
  const { span, manageUrl, greeting, contactLine, ics } = frame(
    visit,
    options,
    true,
  );
  const refund =
    options.refundMinor > 0
      ? formatPrice({
          priceMinor: options.refundMinor,
          currencyCode: visit.currencyCode,
        })
      : null;
  const rows: [string, string][] = [
    ["Usługa", visit.serviceName],
    ...(visit.specialistName
      ? [["Specjalista", visit.specialistName] as [string, string]]
      : []),
    ["Odwołany termin", span],
    ["Numer rezerwacji", visit.reference],
    ["Zwrot", refund ?? "Bez zwrotu"],
  ];
  const intro = refund
    ? `Zwrócimy ${refund} tą samą metodą, którą zapłacono. Pieniądze zwykle wracają w ciągu kilku dni roboczych.`
    : "Wizyta została odwołana po terminie bezpłatnego odwołania, dlatego opłata nie podlega zwrotowi.";
  return {
    subject: `Wizyta ${visit.reference} została odwołana`,
    preview: refund ? `Zwrot ${refund}` : "Wizyta odwołana",
    heading: "Twoja wizyta została odwołana",
    greeting,
    intro,
    rows,
    manageUrl,
    buttonLabel: "Zobacz szczegóły",
    note: "W załączniku jest plik, który usunie wizytę z Twojego kalendarza.",
    contactLine,
    text: plainText({ greeting, intro, rows, manageUrl, contactLine }),
    ics,
  };
}
