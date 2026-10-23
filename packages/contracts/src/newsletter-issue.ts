import { z } from "zod";
import {
  emptyRichTextDocument,
  isRichTextEmpty,
  isSafeRichTextHref,
  richTextDocumentWithMaxCharacters,
  type RichTextDocument,
} from "./rich-text";

// A newsletter issue (docs/architecture/newsletter-domain.md): written in
// the admin's portal, sent through Resend. A subject and the line inboxes
// show under it, a word of introduction, what it points to (published
// articles and e-books, and own cards: a workshop, an event, news) and a
// closing word. Once handed to Resend it keeps its words.

export const NEWSLETTER_ISSUE_LIMITS = {
  subject: 150,
  previewText: 200,
  text: 5000,
  items: 12,
  cardTitle: 120,
  cardText: 400,
  cardLabel: 40,
} as const;

export const NEWSLETTER_ITEM_KINDS = ["article", "ebook", "card"] as const;
export type NewsletterItemKind = (typeof NEWSLETTER_ITEM_KINDS)[number];

export const NEWSLETTER_ITEM_KIND_LABELS: Record<NewsletterItemKind, string> = {
  article: "Artykuł",
  ebook: "E-book",
  card: "Własna karta",
};

const cardHref = z
  .string()
  .trim()
  .max(2048, "Link jest za długi")
  .refine(
    (href) => href === "" || isSafeRichTextHref(href),
    "Podaj link zaczynający się od https:// albo od / (strona centrum)",
  );

export const newsletterItemSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("article"), id: z.string().min(1) }),
  z.strictObject({ kind: z.literal("ebook"), id: z.string().min(1) }),
  z.strictObject({
    kind: z.literal("card"),
    title: z
      .string()
      .trim()
      .min(1, "Wpisz tytuł karty")
      .max(NEWSLETTER_ISSUE_LIMITS.cardTitle, "Tytuł karty jest za długi"),
    text: z
      .string()
      .trim()
      .max(NEWSLETTER_ISSUE_LIMITS.cardText, "Opis karty jest za długi"),
    href: cardHref,
    label: z
      .string()
      .trim()
      .max(
        NEWSLETTER_ISSUE_LIMITS.cardLabel,
        "Napis na przycisku jest za długi",
      ),
  }),
]);

export type NewsletterItem = z.infer<typeof newsletterItemSchema>;
export type NewsletterCard = Extract<NewsletterItem, { kind: "card" }>;

const issueText = richTextDocumentWithMaxCharacters(
  NEWSLETTER_ISSUE_LIMITS.text,
);

export const newsletterIssueDraftSchema = z.strictObject({
  subject: z
    .string()
    .trim()
    .max(NEWSLETTER_ISSUE_LIMITS.subject, "Temat jest za długi"),
  previewText: z
    .string()
    .trim()
    .max(NEWSLETTER_ISSUE_LIMITS.previewText, "Zajawka jest za długa"),
  intro: issueText,
  items: z
    .array(newsletterItemSchema)
    .max(NEWSLETTER_ISSUE_LIMITS.items, "Wydanie może mieć najwyżej 12 kart"),
  closing: issueText,
  inArchive: z.boolean(),
});

export type NewsletterIssueDraft = z.infer<typeof newsletterIssueDraftSchema>;

export function emptyNewsletterIssue(): NewsletterIssueDraft {
  return {
    subject: "",
    previewText: "",
    intro: emptyRichTextDocument as RichTextDocument,
    items: [],
    closing: emptyRichTextDocument as RichTextDocument,
    inArchive: true,
  };
}

/** What is missing before an issue can be sent (in Polish, for the portal). */
export function newsletterIssueProblems(draft: NewsletterIssueDraft): string[] {
  const problems: string[] = [];
  if (!draft.subject.trim()) problems.push("Wpisz temat wydania.");
  if (isRichTextEmpty(draft.intro) && draft.items.length === 0) {
    problems.push("Napisz wstęp albo dodaj choć jedną kartę.");
  }
  return problems;
}

// ------------------------------------------------------------ states

export type NewsletterIssueStatus = "draft" | "sending" | "sent";

/** What the portal shows: a sent issue with its time ahead is scheduled. */
export type NewsletterIssueState = "draft" | "sending" | "scheduled" | "sent";

export const NEWSLETTER_ISSUE_STATE_LABELS: Record<
  NewsletterIssueState,
  string
> = {
  draft: "Szkic",
  sending: "Wysyłanie",
  scheduled: "Zaplanowane",
  sent: "Wysłane",
};

export function newsletterIssueState(
  issue: { status: NewsletterIssueStatus; sendAt: string | null },
  now: Date = new Date(),
): NewsletterIssueState {
  if (issue.status !== "sent") return issue.status;
  return issue.sendAt && new Date(issue.sendAt) > now ? "scheduled" : "sent";
}

export interface NewsletterIssueRow {
  id: string;
  number: number | null;
  subject: string;
  status: NewsletterIssueStatus;
  sendAt: string | null;
  recipients: number | null;
  /** Addresses that stopped the newsletter after it went (until the next). */
  stoppedAfter: number | null;
  inArchive: boolean;
  updatedAt: string;
}

export interface NewsletterIssue extends NewsletterIssueDraft {
  id: string;
  number: number | null;
  status: NewsletterIssueStatus;
  sendAt: string | null;
  broadcastId: string | null;
  recipients: number | null;
  updatedAt: string;
}

/** An issue in the site's archive. */
export interface NewsletterArchiveIssue {
  number: number;
  subject: string;
  previewText: string;
  intro: RichTextDocument;
  items: NewsletterItem[];
  closing: RichTextDocument;
  sendAt: string;
}

/** The archive's address of an issue. */
export const newsletterArchiveHref = (number: number) =>
  `/newsletter/${number}`;

/**
 * An issue's content from the database, made safe: an item or a text that
 * no longer passes the contracts is dropped (rather than breaking a page).
 */
export function readNewsletterContent(row: {
  intro: unknown;
  items: unknown;
  closing: unknown;
}): Pick<NewsletterIssueDraft, "intro" | "items" | "closing"> {
  const text = (value: unknown) => {
    const parsed = issueText.safeParse(value);
    return parsed.success
      ? parsed.data
      : (emptyRichTextDocument as RichTextDocument);
  };
  const items = Array.isArray(row.items)
    ? row.items.flatMap((item) => {
        const parsed = newsletterItemSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  return { intro: text(row.intro), items, closing: text(row.closing) };
}

/** Polish words for the database's refusals when sending. */
export const NEWSLETTER_SEND_PROBLEMS: Record<string, string> = {
  newsletter_issue_not_draft:
    "To wydanie jest już wysyłane albo wysłane. Odśwież stronę.",
  "newsletter_issue_incomplete:subject": "Wpisz temat wydania.",
  newsletter_issue_time_past: "Wybierz godzinę w przyszłości.",
  newsletter_issue_not_scheduled:
    "Tego wydania nie da się już wycofać: właśnie wychodzi albo wyszło.",
};

/** What the admin's portal asks the site's server to do with an issue. */
export const newsletterIssueRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), draft: newsletterIssueDraftSchema }),
  z.object({ action: z.literal("test"), draft: newsletterIssueDraftSchema }),
  z.object({
    action: z.literal("send"),
    id: z.uuid(),
    sendAt: z.iso.datetime({ offset: true }).nullable(),
  }),
  z.object({ action: z.literal("cancel"), id: z.uuid() }),
]);

export type NewsletterIssueRequest = z.infer<
  typeof newsletterIssueRequestSchema
>;
