import {
  NEWSLETTER_ISSUE_STATE_LABELS,
  newsletterIssueState,
  type NewsletterIssueRow,
  type NewsletterIssueState,
  type NewsletterItem,
} from "@repo/contracts/newsletter-issue";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// Newsletter → Wydania's words and small rules: an issue's state as a tag,
// what it says about when it goes, a card's name in the editor, moving a
// card, and the time chosen in the centre's zone as an instant.

export const ISSUE_TIME_ZONE = "Europe/Warsaw";

const TONES = {
  draft: "neutral",
  sending: "warning",
  scheduled: "info",
  sent: "success",
} as const satisfies Record<NewsletterIssueState, string>;

export function issueTag(
  issue: Pick<NewsletterIssueRow, "status" | "sendAt">,
  now = new Date(),
) {
  const state = newsletterIssueState(issue, now);
  return {
    state,
    label: NEWSLETTER_ISSUE_STATE_LABELS[state],
    tone: TONES[state],
  };
}

const DATE_TIME = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ISSUE_TIME_ZONE,
});

export const issueWhen = (iso: string | null) =>
  iso ? DATE_TIME.format(new Date(iso)) : "—";

/** "Wyszło 3 listopada 2026, 08:00 do 120 osób", or when it will go. */
export function issueSummary(
  issue: Pick<
    NewsletterIssueRow,
    "status" | "sendAt" | "recipients" | "stoppedAfter"
  >,
  now = new Date(),
): string | null {
  const state = newsletterIssueState(issue, now);
  if (state === "scheduled") {
    return `Wyjdzie ${issueWhen(issue.sendAt)}, do wszystkich zapisanych w tej chwili (przy planowaniu: ${issue.recipients ?? 0}).`;
  }
  if (state === "sent") {
    const stopped =
      issue.stoppedAfter !== null
        ? `; wypisało się po nim: ${issue.stoppedAfter}`
        : "";
    return `Wyszło ${issueWhen(issue.sendAt)} do ${issue.recipients ?? 0} ${people(issue.recipients ?? 0)}${stopped}.`;
  }
  if (state === "sending") {
    return "Wysyłanie nie skończyło się. Sprawdź w Resend (Broadcasts), czy wydanie wyszło.";
  }
  return null;
}

function people(count: number) {
  if (count === 1) return "osoby";
  return "osób";
}

/** A card's name in the editor's list. */
export function itemTitle(
  item: NewsletterItem,
  titles: {
    articles: ReadonlyMap<string, string>;
    ebooks: ReadonlyMap<string, string>;
  },
): string {
  if (item.kind === "article") {
    return titles.articles.get(item.id) ?? "Artykuł niedostępny (wycofany?)";
  }
  if (item.kind === "ebook") {
    return titles.ebooks.get(item.id) ?? "E-book niedostępny (wycofany?)";
  }
  return item.title || "Karta bez tytułu";
}

/** The list with one item moved up (-1) or down (+1), if it can move. */
export function moveItem<T>(
  items: readonly T[],
  index: number,
  by: -1 | 1,
): T[] {
  const target = index + by;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/** The date and time typed (the centre's zone) as an ISO instant. */
export function sendAtFromLocal(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const instant = fromZonedTime(`${date}T${time}:00`, ISSUE_TIME_ZONE);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

/** Tomorrow at 9:00 in the centre's zone, as the date and time fields. */
export function defaultSendTime(now = new Date()): {
  date: string;
  time: string;
} {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    date: formatInTimeZone(tomorrow, ISSUE_TIME_ZONE, "yyyy-MM-dd"),
    time: "09:00",
  };
}
