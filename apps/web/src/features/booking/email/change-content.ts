import type { ClaimedBookingEmail } from "@repo/supabase";
import { formatPrice } from "@/lib/format";
import { deadlineLabel, localTime, visitLabel } from "../visit-label";
import {
  contactLineOf,
  place,
  placeRow,
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
  /** Why the centre changed it, told to the client (R12). */
  reason?: string | null;
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
    ["Miejsce", placeRow(visit)],
    ...(!visit.paid && visit.paymentDueAt
      ? [
          [
            "Zapłać do",
            deadlineLabel(visit.paymentDueAt, options.timeZone),
          ] as [string, string],
        ]
      : []),
    ["Numer rezerwacji", visit.reference],
    ...(options.reason ? [["Powód", options.reason] as [string, string]] : []),
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
  const byCentre = visit.cancelledBy === "centre";
  const refund =
    options.refundMinor > 0
      ? formatPrice({
          priceMinor: options.refundMinor,
          currencyCode: visit.currencyCode,
        })
      : null;
  // The centre kept part of the payment (a late cancellation, R12).
  const keptMinor =
    byCentre && visit.paid
      ? Math.max(0, visit.priceMinor - options.refundMinor)
      : 0;
  const kept =
    keptMinor > 0
      ? formatPrice({ priceMinor: keptMinor, currencyCode: visit.currencyCode })
      : null;
  const rows: [string, string][] = [
    ["Usługa", visit.serviceName],
    ...(visit.specialistName
      ? [["Specjalista", visit.specialistName] as [string, string]]
      : []),
    ["Odwołany termin", span],
    ["Numer rezerwacji", visit.reference],
    [
      "Zwrot",
      refund ?? (byCentre || !visit.paid ? "Nie dotyczy" : "Bez zwrotu"),
    ],
    ...(kept ? [["Zatrzymano", kept] as [string, string]] : []),
    ...(options.reason ? [["Powód", options.reason] as [string, string]] : []),
  ];
  const money = refund
    ? `Zwrócimy ${refund} tą samą metodą, którą zapłacono. Pieniądze zwykle wracają w ciągu kilku dni roboczych.`
    : null;
  const intro = kept
    ? `Odwołaliśmy Twoją wizytę. ${money ? `${money} ` : ""}Zgodnie z zasadami odwołań zatrzymaliśmy ${kept}.`
    : byCentre
      ? `Przepraszamy, musieliśmy odwołać Twoją wizytę. ${money ?? "Skontaktuj się z nami, a pomożemy umówić nowy termin."}`
      : (money ??
        (visit.paid
          ? "Wizyta została odwołana po terminie bezpłatnego odwołania, dlatego opłata nie podlega zwrotowi."
          : "Odwołaliśmy Twoją rezerwację. Nie była opłacona, więc nie ma nic do zwrotu."));
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

/**
 * Money the centre gave back later (R12): how much, why, and that it goes
 * back the way it was paid. The visit itself does not change, so no
 * calendar file.
 */
export function refundedContent(
  visit: ClaimedBookingEmail,
  {
    siteUrl,
    timeZone,
    contact,
    manageToken,
    refundMinor,
    reason,
  }: Omit<ChangeOptions, "sequence"> & { refundMinor: number },
): VisitEmailContent {
  const manageUrl = `${siteUrl}/wizyta/${manageToken}`;
  const greeting = `Dzień dobry, ${visit.clientName}!`;
  const contactLine = contactLineOf(contact);
  const refund = formatPrice({
    priceMinor: refundMinor,
    currencyCode: visit.currencyCode,
  });
  const rows: [string, string][] = [
    ["Usługa", visit.serviceName],
    ...(visit.specialistName
      ? [["Specjalista", visit.specialistName] as [string, string]]
      : []),
    [
      "Termin wizyty",
      `${visitLabel(visit.startsAt, timeZone)}–${localTime(visit.endsAt, timeZone)}`,
    ],
    ["Numer rezerwacji", visit.reference],
    ["Zwrot", refund],
    ...(reason ? [["Powód", reason] as [string, string]] : []),
  ];
  const intro = `Zwróciliśmy ${refund} za Twoją wizytę tą samą metodą, którą zapłacono. Pieniądze zwykle wracają w ciągu kilku dni roboczych.`;
  return {
    subject: `Zwrot ${refund} za wizytę ${visit.reference}`,
    preview: `Zwrot ${refund}`,
    heading: "Zwróciliśmy pieniądze",
    greeting,
    intro,
    rows,
    manageUrl,
    buttonLabel: "Zobacz szczegóły",
    note: null,
    contactLine,
    text: plainText({ greeting, intro, rows, manageUrl, contactLine }),
    ics: "",
  };
}
