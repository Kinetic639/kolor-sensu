import type {
  ClaimedWorkshopEmail,
  WorkshopEmailKind,
} from "@repo/supabase/workshops";
import {
  contactLineOf,
  type ConfirmationOptions,
  type VisitEmailContent,
} from "@/features/booking/email/confirmation-content";
import { visitIcs } from "@/features/booking/email/ics";
import { deadlineLabel } from "@/features/booking/visit-label";
import { formatPrice } from "@/lib/format";
import { workshopDateLabel, workshopTimeLabel } from "../workshop-view";

// What a workshop's e-mails say (docs/product/workshops-plan.md, PR 4),
// apart from how they look (the visits' template): the confirmation, the
// reservation to pay later (with the link to pay) and the waitlist place.
// Each links to the registration's page by its own token; the first two
// carry the calendar file. Pure, so it is tested without sending.

export function workshopRegistrationUrl(siteUrl: string, token: string) {
  return `${siteUrl}/warsztaty/zapis/${token}`;
}

function placeOf(email: ClaimedWorkshopEmail) {
  if (email.modality === "online")
    return "Online (link do spotkania wyślemy dzień przed)";
  const where =
    [email.locationName, email.locationAddress].filter(Boolean).join(", ") ||
    "Stacjonarnie";
  return email.roomName ? `${where} (${email.roomName})` : where;
}

export function workshopEmailContent(
  kind: WorkshopEmailKind,
  email: ClaimedWorkshopEmail,
  { siteUrl, timeZone, contact }: ConfirmationOptions,
): VisitEmailContent {
  const date = workshopDateLabel(email.startsAt, timeZone);
  const time = workshopTimeLabel(email.startsAt, email.endsAt, timeZone);
  const when = `${date}, ${time}`;
  const manageUrl = workshopRegistrationUrl(siteUrl, email.manageToken);
  const price = {
    priceMinor: email.priceMinor,
    currencyCode: email.currencyCode,
  };
  const due = email.paymentDueAt
    ? deadlineLabel(email.paymentDueAt, timeZone)
    : null;

  const rows: [string, string][] = [
    ["Warsztat", email.workshopTitle],
    ["Termin", when],
    ["Miejsce", placeOf(email)],
    ...(email.leaders ? [["Prowadzi", email.leaders] as [string, string]] : []),
    ...(kind === "confirmation" && email.paidMinor > 0
      ? [
          [
            "Zapłacono",
            formatPrice({ ...price, priceMinor: email.paidMinor }),
          ] as [string, string],
        ]
      : kind === "reserved"
        ? [["Do zapłaty", formatPrice(price)] as [string, string]]
        : []),
    ...(kind === "reserved" && due
      ? [["Termin płatności", due] as [string, string]]
      : []),
    ...(kind === "waitlisted" && email.waitlistPosition
      ? [
          ["Miejsce na liście", String(email.waitlistPosition)] as [
            string,
            string,
          ],
        ]
      : []),
    ["Numer zapisu", email.reference],
  ];

  const copy = {
    confirmation: {
      subject: `Potwierdzenie zapisu ${email.reference} – ${email.workshopTitle}`,
      heading: "Twoje miejsce na warsztacie jest potwierdzone",
      intro:
        email.paidMinor > 0
          ? "Dziękujemy za zapis i płatność."
          : "Dziękujemy za zapis.",
      button: "Zobacz swój zapis",
      note: "W załączniku jest plik, który doda warsztat do Twojego kalendarza.",
    },
    reserved: {
      subject: `Rezerwacja miejsca ${email.reference} – opłać do ${due ?? "terminu"}`,
      heading: "Twoje miejsce jest zarezerwowane",
      intro: due
        ? `Opłać je do ${due}; jeśli płatność nie dotrze, miejsce się zwolni.`
        : "Opłać je w terminie; jeśli płatność nie dotrze, miejsce się zwolni.",
      button: "Zapłać za warsztat",
      note: "W załączniku jest plik, który doda warsztat do Twojego kalendarza.",
    },
    waitlisted: {
      subject: `Lista rezerwowa ${email.reference} – ${email.workshopTitle}`,
      heading: "Jesteś na liście rezerwowej",
      intro:
        "Gdy zwolni się miejsce, napiszemy do Ciebie; będziesz mieć 24 godziny na zapłatę.",
      button: "Zobacz swój zapis",
      note: null,
    },
  }[kind];

  const contactLine = contactLineOf(contact);
  const greeting = `Dzień dobry, ${email.clientName}!`;
  const text = [
    greeting,
    "",
    copy.intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `${copy.button}: ${manageUrl}`,
    ...(copy.note ? ["", copy.note] : []),
    ...(contactLine
      ? ["", `W razie pytań skontaktuj się z nami: ${contactLine}`]
      : []),
    "",
    "Do zobaczenia,",
    "Kolor Sensu",
  ].join("\n");

  return {
    subject: copy.subject,
    preview: `${email.workshopTitle}, ${when}`,
    heading: copy.heading,
    greeting,
    intro: copy.intro,
    rows,
    manageUrl,
    buttonLabel: copy.button,
    note: copy.note,
    contactLine,
    text,
    ics: visitIcs({
      uid: `${email.reference}@kolorsensu.pl`,
      startsAt: email.startsAt,
      endsAt: email.endsAt,
      summary: `${email.workshopTitle} – warsztat w Kolor Sensu`,
      location: placeOf(email),
      description: [
        `Numer zapisu: ${email.reference}`,
        `Szczegóły: ${manageUrl}`,
      ].join("\n"),
      url: manageUrl,
    }),
  };
}
