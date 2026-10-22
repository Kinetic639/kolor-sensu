import { z } from "zod";

// The newsletter (docs/architecture/newsletter-domain.md): who signs up,
// with which consent, and how the admin's portal names their state. The
// database keeps the consent as the person saw it, with its version; a new
// wording gets a new version.

export const NEWSLETTER_SOURCES = [
  "home",
  "footer",
  "booking",
  "article",
  "archive",
] as const;
export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];

export const NEWSLETTER_SOURCE_LABELS: Record<NewsletterSource, string> = {
  home: "Strona główna",
  footer: "Stopka",
  booking: "Rezerwacja wizyty",
  article: "Pod artykułem",
  archive: "Archiwum newslettera",
};

/** Change it whenever the consent's words change. */
export const NEWSLETTER_CONSENT_VERSION = "2026-10-22";

/**
 * The consent beside the checkbox, before the link to the privacy policy
 * (the form shows the link; the database keeps the whole sentence).
 */
export function newsletterConsentLead(controller: string): string {
  return `Chcę dostawać na ten adres newsletter Kolor Sensu: artykuły, warsztaty i nowości z centrum, mniej więcej raz w miesiącu. Mogę się wypisać w każdej chwili, linkiem w każdej wiadomości. Administratorem danych jest ${controller}. Więcej w`;
}

export const NEWSLETTER_CONSENT_LINK_LABEL = "polityce prywatności";

/** The whole consent, as kept with the sign-up. */
export function newsletterConsentText(controller: string): string {
  return `${newsletterConsentLead(controller)} ${NEWSLETTER_CONSENT_LINK_LABEL}.`;
}

export const newsletterSignupSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .max(254, "Adres e-mail jest za długi")
    .email("Podaj poprawny adres e-mail"),
  consent: z.literal(true, {
    error: "Zaznacz zgodę, żeby zapisać się na newsletter",
  }),
  source: z.enum(NEWSLETTER_SOURCES),
});

export type NewsletterSignup = z.infer<typeof newsletterSignupSchema>;

export const NEWSLETTER_STATUSES = [
  "pending",
  "active",
  "unsubscribed",
  "removing",
] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];

export const NEWSLETTER_STATUS_LABELS: Record<NewsletterStatus, string> = {
  pending: "Czeka na potwierdzenie",
  active: "Zapisany",
  unsubscribed: "Wypisany",
  removing: "Usuwanie",
};

export const NEWSLETTER_STOP_REASONS = [
  "unsubscribed",
  "bounced",
  "complained",
] as const;
export type NewsletterStopReason = (typeof NEWSLETTER_STOP_REASONS)[number];

export const NEWSLETTER_STOP_REASON_LABELS: Record<
  NewsletterStopReason,
  string
> = {
  unsubscribed: "wypisał się",
  bounced: "adres nie istnieje",
  complained: "zgłoszono jako spam",
};

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: NewsletterStatus;
  source: NewsletterSource;
  consentVersion: string;
  requestedAt: string;
  confirmedAt: string | null;
  stoppedAt: string | null;
  stopReason: NewsletterStopReason | null;
  /** Copied to Resend (a confirmed address waits for the next sync). */
  synced: boolean;
}

/** How many addresses are in each state. */
export function countNewsletterStatuses(
  subscribers: readonly Pick<NewsletterSubscriber, "status">[],
): Record<NewsletterStatus, number> {
  const counts: Record<NewsletterStatus, number> = {
    pending: 0,
    active: 0,
    unsubscribed: 0,
    removing: 0,
  };
  for (const { status } of subscribers) counts[status] += 1;
  return counts;
}

// A cell a spreadsheet would read as a formula starts with an apostrophe.
const csvCell = (raw: string) => {
  const value = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n;]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
};

/**
 * The subscribed addresses as CSV (for moving the list elsewhere): the
 * address, when it was confirmed, where it came from and the consent's
 * version.
 */
export function newsletterCsv(
  subscribers: readonly NewsletterSubscriber[],
): string {
  const rows = subscribers
    .filter((subscriber) => subscriber.status === "active")
    .map((subscriber) =>
      [
        subscriber.email,
        subscriber.confirmedAt ?? "",
        NEWSLETTER_SOURCE_LABELS[subscriber.source],
        subscriber.consentVersion,
      ]
        .map(csvCell)
        .join(","),
    );
  return ["email,potwierdzono,zrodlo,wersja_zgody", ...rows].join("\n");
}
