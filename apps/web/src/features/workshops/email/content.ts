import type {
  ClaimedWorkshopEmail,
  WorkshopEmailKind,
  WorkshopTransfer,
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

// What a workshop's e-mails say (docs/product/workshops-plan.md, PR 4 and
// 5), apart from how they look (the visits' template): the confirmation,
// the reservation to pay later, the waitlist place, a seat offered from
// the waitlist, the payment reminder, the reminder a day before (with the
// online link), a cancellation, a new date, a new leader and a refund;
// and the invitation to take a seat someone passes on. Each links to its
// page by its own token; those about the date carry the calendar file.
// Pure, so it is tested without sending.

export function workshopRegistrationUrl(siteUrl: string, token: string) {
  return `${siteUrl}/warsztaty/zapis/${token}`;
}

/** The admin's reason as one sentence: trimmed, one full stop at its end. */
function withFullStop(reason: string) {
  const text = reason.trim();
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function placeOf(email: ClaimedWorkshopEmail) {
  if (email.modality === "online")
    return email.meetingUrl
      ? `Online: ${email.meetingUrl}`
      : "Online (link do spotkania wyślemy dzień przed)";
  const where =
    [email.locationName, email.locationAddress].filter(Boolean).join(", ") ||
    "Stacjonarnie";
  return email.roomName ? `${where} (${email.roomName})` : where;
}

/** The e-mails that carry the calendar file (about the date). */
export const WITH_CALENDAR: ReadonlySet<WorkshopEmailKind> = new Set([
  "confirmation",
  "reserved",
  "reminder",
  "rescheduled",
]);

type Row = [label: string, value: string];

export function workshopEmailContent(
  kind: WorkshopEmailKind,
  email: ClaimedWorkshopEmail,
  { siteUrl, timeZone, contact }: ConfirmationOptions,
): VisitEmailContent {
  const date = workshopDateLabel(email.startsAt, timeZone);
  const time = workshopTimeLabel(email.startsAt, email.endsAt, timeZone);
  const when = `${date}, ${time}`;
  const manageUrl = workshopRegistrationUrl(siteUrl, email.manageToken);
  const money = (minor: number) =>
    formatPrice({ priceMinor: minor, currencyCode: email.currencyCode });
  const due = email.paymentDueAt
    ? deadlineLabel(email.paymentDueAt, timeZone)
    : null;
  const offerUntil = email.offerExpiresAt
    ? deadlineLabel(email.offerExpiresAt, timeZone)
    : null;
  const refund = email.refundDueMinor - email.refundedMinor;

  const extra: Row[] = [];
  if (kind === "confirmation" && email.paidMinor > 0)
    extra.push(["Zapłacono", money(email.paidMinor)]);
  // A seat waiting for its confirming from this e-mail (#269).
  const confirmUntil = email.confirmBy
    ? deadlineLabel(email.confirmBy, timeZone)
    : null;
  if (kind === "reserved" && confirmUntil) {
    if (email.priceMinor > 0)
      extra.push(["Do zapłaty", money(email.priceMinor)]);
    extra.push(["Potwierdź do", confirmUntil]);
  } else if (kind === "reserved" || kind === "payment_reminder") {
    extra.push(["Do zapłaty", money(email.priceMinor)]);
    if (due) extra.push(["Termin płatności", due]);
  }
  if (kind === "offered") {
    extra.push(["Do zapłaty", money(email.priceMinor)]);
    if (offerUntil) extra.push(["Miejsce czeka do", offerUntil]);
  }
  if (kind === "waitlisted" && email.waitlistPosition)
    extra.push(["Miejsce na liście", String(email.waitlistPosition)]);
  if (kind === "cancelled" && email.refundDueMinor > 0)
    extra.push(["Zwrot", money(email.refundDueMinor)]);
  if (kind === "refunded") extra.push(["Zwrócono", money(email.refundedMinor)]);

  const rows: Row[] = [
    ["Warsztat", email.workshopTitle],
    ["Termin", when],
    ["Miejsce", placeOf(email)],
    ...(email.modality !== "online" && email.locationDirections?.trim()
      ? [["Jak dojechać", email.locationDirections.trim()] as Row]
      : []),
    ...(email.leaders ? [["Prowadzi", email.leaders] as Row] : []),
    ...extra,
    ["Numer zapisu", email.reference],
  ];

  const byCentre = email.cancelledBy === "centre";
  const cancelIntro =
    email.cancelledBy === "system"
      ? "Płatność nie dotarła w terminie, więc miejsce się zwolniło."
      : byCentre
        ? `Musimy odwołać Twój udział${email.cancelReason ? `: ${withFullStop(email.cancelReason)}` : "."}`
        : "Potwierdzamy rezygnację z warsztatu.";
  const refundIntro =
    email.refundDueMinor > 0
      ? ` Zwrócimy ${money(email.refundDueMinor)} na konto, z którego przyszła płatność (zwykle kilka dni roboczych).`
      : email.refundWhenReplaced
        ? " Jeśli Twoje miejsce zajmie ktoś z listy rezerwowej, oddamy całą wpłatę i napiszemy o tym."
        : "";

  const copy: Record<
    WorkshopEmailKind,
    {
      subject: string;
      heading: string;
      intro: string;
      button: string;
      note: string | null;
    }
  > = {
    confirmation: {
      subject: `Potwierdzenie zapisu ${email.reference} – ${email.workshopTitle}`,
      heading: "Twoje miejsce na warsztacie jest potwierdzone",
      intro:
        email.paidMinor > 0 || email.paidOutside
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
    offered: {
      subject: `Zwolniło się miejsce – ${email.workshopTitle}`,
      heading: "Zwolniło się miejsce dla Ciebie",
      intro: offerUntil
        ? `Miejsce czeka na Ciebie do ${offerUntil}. Opłać je, a będzie Twoje; potem dostanie je kolejna osoba z listy.`
        : "Opłać miejsce, a będzie Twoje; potem dostanie je kolejna osoba z listy.",
      button: "Zapłać i zajmij miejsce",
      note: null,
    },
    payment_reminder: {
      subject: `Przypomnienie: opłać warsztat do ${due ?? "terminu"}`,
      heading: "Przypominamy o płatności",
      intro: due
        ? `Twoje miejsce czeka na płatność do ${due}; potem się zwolni.`
        : "Twoje miejsce czeka na płatność; po terminie się zwolni.",
      button: "Zapłać za warsztat",
      note: null,
    },
    reminder: {
      subject: `Jutro: ${email.workshopTitle}`,
      heading: "Do zobaczenia na warsztacie",
      intro:
        email.modality === "online" && email.meetingUrl
          ? `Przypominamy o jutrzejszym warsztacie. Link do spotkania: ${email.meetingUrl}`
          : "Przypominamy o jutrzejszym warsztacie.",
      button: "Zobacz swój zapis",
      note: "W załączniku jest plik, który doda warsztat do Twojego kalendarza.",
    },
    cancelled: {
      subject: byCentre
        ? `Warsztat odwołany – ${email.workshopTitle}`
        : `Rezygnacja z warsztatu ${email.reference}`,
      heading: byCentre ? "Warsztat jest odwołany" : "Zapis anulowany",
      intro: `${cancelIntro}${refundIntro}`,
      button: "Zobacz szczegóły",
      note: null,
    },
    rescheduled: {
      subject: `Nowy termin warsztatu – ${email.workshopTitle}`,
      heading: "Warsztat ma nowy termin",
      intro:
        "Zmieniliśmy termin warsztatu (nowy jest poniżej). Jeśli nie pasuje, możesz zrezygnować na stronie zapisu z pełnym zwrotem, w każdej chwili przed warsztatem.",
      button: "Zobacz swój zapis",
      note: "W załączniku jest plik z nowym terminem do kalendarza.",
    },
    leader_changed: {
      subject: `Zmiana prowadzenia warsztatu – ${email.workshopTitle}`,
      heading: "Warsztat poprowadzi ktoś inny",
      intro:
        email.waitlistPosition || email.offerExpiresAt
          ? "Zmieniła się osoba prowadząca warsztat (prowadzi: poniżej). Możesz zostać na liście rezerwowej albo się z niej wypisać na stronie zapisu."
          : "Zmieniła się osoba prowadząca warsztat (prowadzi: poniżej). Jeśli wolisz zrezygnować, zrób to na stronie zapisu: oddamy całą wpłatę, w każdej chwili przed warsztatem.",
      button: "Zobacz swój zapis",
      note: null,
    },
    refunded: {
      subject: `Zwrot za warsztat ${email.reference}`,
      heading: "Oddaliśmy Twoją wpłatę",
      intro:
        refund > 0
          ? `Oddaliśmy ${money(email.refundedMinor)}; pozostałą część oddamy wkrótce.`
          : `Oddaliśmy ${money(email.refundedMinor)} na konto, z którego przyszła płatność (zwykle kilka dni roboczych).`,
      button: "Zobacz szczegóły",
      note: null,
    },
    seat_lost: {
      subject: `Zwrot za warsztat ${email.reference}`,
      heading: "Miejsce było już zajęte",
      intro: `Twoja płatność dotarła po czasie, w którym czekało na Ciebie miejsce, a w międzyczasie zajęła je inna osoba. Oddaliśmy całe ${money(email.refundedMinor)} na konto, z którego przyszła płatność (zwykle kilka dni roboczych). Jeśli zwolni się miejsce albo pojawi się nowy termin, zapraszamy ponownie.`,
      button: "Zobacz szczegóły",
      note: null,
    },
  };
  // Someone signed up with another's address (Warsztat · 10, card 6).
  const notYou =
    "Jeśli to nie Ty zapisujesz się na ten warsztat, zrezygnuj na stronie zapisu; bez płatności nic Cię to nie kosztuje.";
  const unpaid =
    kind === "reserved" ||
    kind === "waitlisted" ||
    kind === "offered" ||
    (kind === "confirmation" && email.paidMinor === 0 && !email.paidOutside);
  const toConfirm = {
    subject: `Potwierdź zapis ${email.reference} – ${email.workshopTitle}`,
    heading: "Potwierdź swój zapis",
    intro: `Otwórz swój zapis i kliknij „Potwierdzam zapis” do ${confirmUntil}. Bez potwierdzenia miejsce wróci do puli.${
      email.priceMinor > 0
        ? " Potem opłać miejsce najpóźniej 7 dni przed warsztatem."
        : ""
    } Jeśli to nie Ty zapisujesz się na ten warsztat, zignoruj tę wiadomość.`,
    button: "Potwierdź zapis",
    note: null,
  };
  const words =
    kind === "reserved" && confirmUntil
      ? toConfirm
      : unpaid
        ? { ...copy[kind], intro: `${copy[kind].intro} ${notYou}` }
        : copy[kind];

  const contactLine = contactLineOf(contact);
  const greeting = `Dzień dobry, ${email.clientName}!`;
  const text = [
    greeting,
    "",
    words.intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `${words.button}: ${manageUrl}`,
    ...(words.note ? ["", words.note] : []),
    ...(contactLine
      ? ["", `W razie pytań skontaktuj się z nami: ${contactLine}`]
      : []),
    "",
    "Do zobaczenia,",
    "Kolor Sensu",
  ].join("\n");

  return {
    subject: words.subject,
    preview: `${email.workshopTitle}, ${when}`,
    heading: words.heading,
    greeting,
    intro: words.intro,
    rows,
    manageUrl,
    buttonLabel: words.button,
    note: words.note,
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
      // A new date updates the same event in calendars.
      sequence: kind === "rescheduled" ? 1 : 0,
    }),
  };
}

/** The invitation to take a seat someone passes on (Warsztat · 8, card 4). */
export function workshopTransferUrl(siteUrl: string, token: string) {
  return `${siteUrl}/warsztaty/przekazanie/${token}`;
}

export function workshopTransferContent(
  invite: WorkshopTransfer,
  token: string,
  { siteUrl, timeZone, contact }: ConfirmationOptions,
): VisitEmailContent {
  const when = `${workshopDateLabel(invite.startsAt, timeZone)}, ${workshopTimeLabel(invite.startsAt, invite.endsAt, timeZone)}`;
  const url = workshopTransferUrl(siteUrl, token);
  const from = invite.fromName ?? "Uczestnik warsztatu";
  const intro = `${from} przekazuje Ci swoje miejsce na warsztacie. Żeby je przyjąć, zaakceptuj przed warsztatem regulamin warsztatów i zasady przetwarzania danych; do tego czasu miejsce zostaje przy osobie, która je przekazuje. Jeśli nie chcesz go przyjąć, nic nie rób.`;
  const rows: Row[] = [
    ["Warsztat", invite.workshopTitle],
    ["Termin", when],
    ["Forma", invite.modality === "online" ? "Online" : "Stacjonarnie"],
    ["Numer zapisu", invite.reference],
  ];
  const contactLine = contactLineOf(contact);
  const greeting = `Dzień dobry, ${invite.firstName} ${invite.lastName}!`;
  const button = "Przyjmij miejsce";
  return {
    subject: `${from} przekazuje Ci miejsce – ${invite.workshopTitle}`,
    preview: `${invite.workshopTitle}, ${when}`,
    heading: "Ktoś przekazuje Ci miejsce na warsztacie",
    greeting,
    intro,
    rows,
    manageUrl: url,
    buttonLabel: button,
    note: null,
    contactLine,
    text: [
      greeting,
      "",
      intro,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      `${button}: ${url}`,
      ...(contactLine
        ? ["", `W razie pytań skontaktuj się z nami: ${contactLine}`]
        : []),
      "",
      "Do zobaczenia,",
      "Kolor Sensu",
    ].join("\n"),
    ics: "",
  };
}
