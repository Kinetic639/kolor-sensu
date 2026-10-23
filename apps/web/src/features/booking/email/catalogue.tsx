import { render } from "@react-email/components";
import type { ClaimedBookingEmail } from "@repo/supabase";
import {
  cancelledContent,
  refundedContent,
  rescheduledContent,
} from "./change-content";
import {
  confirmationContent,
  withCompany,
  type ConfirmationOptions,
  type VisitEmailContent,
} from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";
import {
  reservationContent,
  unpaidCancelledContent,
  visitReminderContent,
} from "./payment-content";

// Every e-mail a client gets, as the admin's portal shows them (CMS →
// E-maile): what each is, when it goes, and what it says, built by the
// same functions and template as the real ones, from a sample visit (no
// one's details). The centre's settings say when the reminders go.

export interface CatalogueOptions extends ConfirmationOptions {
  /** Ustawienia → Rezerwacje online (none: switched off). */
  visitReminderHours: number | null;
  paymentReminderHours: number | null;
}

export interface CatalogueEmail {
  key: string;
  group: "Rezerwacja i płatność" | "Przed wizytą" | "Zmiany i odwołania";
  name: string;
  /** When it goes, in a sentence. */
  when: string;
  attachment: string | null;
  build: () => VisitEmailContent;
}

const SAMPLE: ClaimedBookingEmail & { manageToken: string } = {
  reference: "KS-20261112-1042",
  mode: "in_person",
  startsAt: "2026-11-12T09:00:00Z",
  endsAt: "2026-11-12T09:50:00Z",
  serviceName: "Konsultacja psychologiczna",
  specialistName: "Anna Nowak",
  roomName: "Gabinet Zielony",
  locationName: "Kolor Sensu",
  locationAddress: "ul. Przykładowa 1, 61-001 Poznań",
  priceMinor: 24_000,
  currencyCode: "PLN",
  clientName: "Joanna Kowalska",
  clientEmail: "klient@example.invalid",
  manageToken: "przyklad",
  cancelledBy: null,
  bookedBy: "client",
  paid: true,
  paymentDueAt: null,
  confirmBy: null,
};

const unpaid = {
  ...SAMPLE,
  paid: false,
  paymentDueAt: "2026-11-10T09:00:00Z",
};

const CALENDAR = "Plik kalendarza (.ics)";
const CALENDAR_CANCEL = "Plik kalendarza usuwający wizytę (.ics)";

export function clientEmails(options: CatalogueOptions): CatalogueEmail[] {
  const change = { ...options, manageToken: SAMPLE.manageToken, sequence: 1 };
  const off = "Wyłączone w Ustawieniach: nie jest wysyłane.";
  return [
    {
      key: "confirmation",
      group: "Rezerwacja i płatność",
      name: "Potwierdzenie wizyty",
      when: "Od razu po opłaceniu wizyty.",
      attachment: CALENDAR,
      build: () => confirmationContent(SAMPLE, options),
    },
    {
      key: "reserved",
      group: "Rezerwacja i płatność",
      name: "Rezerwacja do potwierdzenia",
      when: "Gdy klient rezerwuje i płaci później: potwierdza rezerwację w ciągu 30 minut, potem płaci.",
      attachment: CALENDAR,
      build: () =>
        reservationContent(
          "reserved",
          { ...unpaid, confirmBy: "2026-11-08T09:30:00Z" },
          options,
        ),
    },
    {
      key: "reserved-by-centre",
      group: "Rezerwacja i płatność",
      name: "Wizyta zapisana przez centrum",
      when: "Gdy centrum zapisze klienta, z linkiem do płatności.",
      attachment: CALENDAR,
      build: () =>
        reservationContent(
          "reserved",
          { ...unpaid, bookedBy: "centre" },
          options,
        ),
    },
    {
      key: "payment-reminder",
      group: "Rezerwacja i płatność",
      name: "Przypomnienie o płatności",
      when:
        options.paymentReminderHours === null
          ? off
          : `${options.paymentReminderHours} godz. przed terminem zapłaty.`,
      attachment: CALENDAR,
      build: () => reservationContent("payment_reminder", unpaid, options),
    },
    {
      key: "payment-last-call",
      group: "Rezerwacja i płatność",
      name: "Ostatnie wezwanie do zapłaty",
      when: "6 godz. przed terminem zapłaty.",
      attachment: CALENDAR,
      build: () => reservationContent("payment_last_call", unpaid, options),
    },
    {
      key: "unpaid-cancelled",
      group: "Rezerwacja i płatność",
      name: "Anulowanie z braku płatności",
      when: "Gdy minie termin zapłaty, a rezerwacja nie jest opłacona.",
      attachment: CALENDAR_CANCEL,
      build: () =>
        unpaidCancelledContent({ ...unpaid, cancelledBy: "system" }, options),
    },
    {
      key: "visit-reminder",
      group: "Przed wizytą",
      name: "Przypomnienie o wizycie",
      when:
        options.visitReminderHours === null
          ? off
          : `${options.visitReminderHours} godz. przed opłaconą wizytą.`,
      attachment: CALENDAR,
      build: () => visitReminderContent(SAMPLE, options),
    },
    {
      key: "rescheduled",
      group: "Zmiany i odwołania",
      name: "Nowy termin",
      when: "Gdy klient lub centrum przełoży wizytę.",
      attachment: "Plik kalendarza przenoszący wizytę (.ics)",
      build: () => rescheduledContent(SAMPLE, change),
    },
    {
      key: "cancelled-refund",
      group: "Zmiany i odwołania",
      name: "Odwołanie przez klienta ze zwrotem",
      when: "Klient odwołuje opłaconą wizytę w terminie bezpłatnego odwołania.",
      attachment: CALENDAR_CANCEL,
      build: () =>
        cancelledContent(
          { ...SAMPLE, cancelledBy: "client" },
          { ...change, refundMinor: SAMPLE.priceMinor },
        ),
    },
    {
      key: "cancelled-late",
      group: "Zmiany i odwołania",
      name: "Odwołanie przez klienta bez zwrotu",
      when: "Klient odwołuje opłaconą wizytę po terminie bezpłatnego odwołania.",
      attachment: CALENDAR_CANCEL,
      build: () =>
        cancelledContent(
          { ...SAMPLE, cancelledBy: "client" },
          { ...change, refundMinor: 0 },
        ),
    },
    {
      key: "cancelled-unpaid",
      group: "Zmiany i odwołania",
      name: "Odwołanie nieopłaconej rezerwacji",
      when: "Klient odwołuje rezerwację, zanim za nią zapłacił.",
      attachment: CALENDAR_CANCEL,
      build: () =>
        cancelledContent(
          { ...unpaid, cancelledBy: "client" },
          { ...change, refundMinor: 0 },
        ),
    },
    {
      key: "cancelled-by-centre",
      group: "Zmiany i odwołania",
      name: "Odwołanie przez centrum",
      when: "Centrum odwołuje wizytę i zwraca całą opłatę.",
      attachment: CALENDAR_CANCEL,
      build: () =>
        cancelledContent(
          { ...SAMPLE, cancelledBy: "centre" },
          {
            ...change,
            refundMinor: SAMPLE.priceMinor,
            reason: "Choroba specjalisty",
          },
        ),
    },
    {
      key: "cancelled-by-centre-kept",
      group: "Zmiany i odwołania",
      name: "Odwołanie przez centrum z częściowym zwrotem",
      when: "Centrum odwołuje wizytę po terminie i zatrzymuje część opłaty.",
      attachment: CALENDAR_CANCEL,
      build: () =>
        cancelledContent(
          { ...SAMPLE, cancelledBy: "centre" },
          { ...change, refundMinor: SAMPLE.priceMinor / 2 },
        ),
    },
    {
      key: "refunded",
      group: "Zmiany i odwołania",
      name: "Zwrot pieniędzy",
      when: "Gdy centrum zleci zwrot już po odwołaniu wizyty.",
      attachment: null,
      build: () =>
        refundedContent(
          { ...SAMPLE, cancelledBy: "centre" },
          { ...change, refundMinor: SAMPLE.priceMinor / 2 },
        ),
    },
  ];
}

export interface EmailPreview {
  key: string;
  group: CatalogueEmail["group"] | "Newsletter";
  name: string;
  when: string;
  attachment: string | null;
  subject: string;
  preview: string;
  html: string;
  text: string;
}

/** Each e-mail as the client gets it: its HTML and plain text. */
export async function emailPreviews(
  options: CatalogueOptions,
  company: string | null,
): Promise<EmailPreview[]> {
  return Promise.all(
    clientEmails(options).map(async ({ build, ...email }) => {
      const content = build();
      return {
        ...email,
        subject: content.subject,
        preview: content.preview,
        html: await render(
          <ConfirmationEmail company={company} content={content} />,
        ),
        text: withCompany(content.text, company),
      };
    }),
  );
}
