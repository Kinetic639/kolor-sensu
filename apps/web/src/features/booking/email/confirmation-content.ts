import type { ClaimedBookingEmail } from "@repo/supabase";
import { formatPrice } from "@/lib/format";
import { localTime, visitLabel } from "../visit-label";
import { visitIcs } from "./ics";

// What the confirmation e-mail says (docs/product/booking-plan.md, R7),
// apart from how it looks: the subject, the visit's details, the link to
// the visit, a plain-text version and the calendar file. Only what the
// client needs; nothing about their health.

export interface ConfirmationOptions {
  /** `https://kolorsensu.pl`, no trailing slash. */
  siteUrl: string;
  timeZone: string;
  contact: { phone?: string; email?: string };
}

/** What a visit e-mail says; the template (./confirmation-email) lays it out. */
export interface VisitEmailContent {
  subject: string;
  preview: string;
  heading: string;
  greeting: string;
  /** Follows the greeting. */
  intro: string;
  rows: [label: string, value: string][];
  manageUrl: string;
  buttonLabel: string;
  /** Under the button, e.g. about the calendar file. */
  note: string | null;
  contactLine: string | null;
  text: string;
  ics: string;
}

export type ConfirmationContent = VisitEmailContent;

export function place(visit: ClaimedBookingEmail) {
  if (visit.mode === "online") return "Online";
  const where = [visit.locationName, visit.locationAddress]
    .filter(Boolean)
    .join(", ");
  const room = visit.roomName ? ` (${visit.roomName})` : "";
  return `${where || "Stacjonarnie"}${room}`;
}

/** `+48 600 100 200 · kontakt@kolorsensu.pl`, or null. */
export function contactLineOf(contact: ConfirmationOptions["contact"]) {
  return [contact.phone, contact.email].filter(Boolean).join(" · ") || null;
}

export function confirmationContent(
  visit: ClaimedBookingEmail & { manageToken: string },
  { siteUrl, timeZone, contact }: ConfirmationOptions,
): ConfirmationContent {
  const when = visitLabel(visit.startsAt, timeZone);
  const manageUrl = `${siteUrl}/wizyta/${visit.manageToken}`;
  const rows: [string, string][] = [
    ["Usługa", visit.serviceName],
    ...(visit.specialistName
      ? [["Specjalista", visit.specialistName] as [string, string]]
      : []),
    ["Termin", `${when}–${localTime(visit.endsAt, timeZone)}`],
    ["Miejsce", place(visit)],
    ["Zapłacono", formatPrice(visit)],
    ["Numer rezerwacji", visit.reference],
  ];
  const contactLine = contactLineOf(contact);
  const greeting = `Dzień dobry, ${visit.clientName}!`;

  const text = [
    greeting,
    "",
    "Twoja wizyta w Kolor Sensu jest potwierdzona i opłacona.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Szczegóły wizyty: ${manageUrl}`,
    "",
    "W załączniku jest plik, który doda wizytę do Twojego kalendarza.",
    ...(contactLine
      ? ["", `Jeśli chcesz coś zmienić, skontaktuj się z nami: ${contactLine}`]
      : []),
    "",
    "Do zobaczenia,",
    "Kolor Sensu",
  ].join("\n");

  return {
    subject: `Potwierdzenie wizyty ${visit.reference} – ${when}`,
    preview: `${visit.serviceName}, ${when}`,
    heading: "Twoja wizyta jest potwierdzona",
    greeting,
    intro: "Dziękujemy za rezerwację i płatność.",
    rows,
    manageUrl,
    buttonLabel: "Zobacz swoją wizytę",
    note: "W załączniku jest plik, który doda wizytę do Twojego kalendarza.",
    contactLine,
    text,
    ics: visitIcs({
      uid: `${visit.reference}@kolorsensu.pl`,
      startsAt: visit.startsAt,
      endsAt: visit.endsAt,
      summary: `${visit.serviceName} – Kolor Sensu`,
      location: place(visit),
      description: [
        `Numer rezerwacji: ${visit.reference}`,
        visit.specialistName ? `Specjalista: ${visit.specialistName}` : null,
        `Szczegóły: ${manageUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
      url: manageUrl,
    }),
  };
}
