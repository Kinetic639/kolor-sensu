import type { NewsletterArchiveIssue } from "@repo/contracts/newsletter-issue";
import { newsletterArchiveHref } from "@repo/contracts/newsletter-issue";
import type { NewsletterArchiveEntry } from "@repo/ui/public-site";

// The archive's words and dates (Polish, the centre's time zone).

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

export const issueDate = (iso: string) => DATE.format(new Date(iso));

export function archiveEntry(
  issue: NewsletterArchiveIssue,
): NewsletterArchiveEntry {
  return {
    number: issue.number,
    href: newsletterArchiveHref(issue.number),
    subject: issue.subject,
    previewText: issue.previewText,
    date: issueDate(issue.sendAt),
    dateTime: issue.sendAt,
  };
}

/** The issue number from the address ("3"), or null. */
export function issueNumber(value: string): number | null {
  return /^[1-9]\d{0,5}$/.test(value) ? Number(value) : null;
}
