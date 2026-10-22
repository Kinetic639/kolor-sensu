import type {
  NewsletterIssue,
  NewsletterIssueDraft,
} from "@repo/contracts/newsletter-issue";
import {
  claimNewsletterIssue,
  finishNewsletterIssue,
  getNewsletterIssue,
  releaseNewsletterIssue,
  unscheduleNewsletterIssue,
} from "@repo/supabase/newsletter";
import type { createSupabasePublicClient } from "@repo/supabase/public";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { emailSender, resend, sendEmail } from "@/lib/email";
import { articleImageUrl, getArticles, getEbooks } from "@/lib/education-data";
import { getSiteFrame } from "@/lib/site-frame";
import {
  renderNewsletterIssue,
  RESEND_UNSUBSCRIBE_URL,
  type RenderedNewsletterIssue,
} from "./issue-email";
import { newsletterCards } from "./issue-items";
import {
  cancelNewsletterIssue,
  sendNewsletterIssue,
  type SendOutcome,
} from "./issue-send";
import { syncNewsletterNow } from "./server";

// Issues on the site's server, for the admin's portal (/api/centrum/
// newsletter): the preview and the test (from the draft as it is in the
// editor), sending and taking back (as the admin, whose token the request
// brought). NEWSLETTER_FROM is the sender (EMAIL_FROM unless set);
// RESEND_NEWSLETTER_SEGMENT_ID the segment it goes to.

type Client = ReturnType<typeof createSupabasePublicClient>;

/** `Kolor Sensu <newsletter@…>`, from NEWSLETTER_FROM, else EMAIL_FROM. */
export function newsletterSender() {
  const from = process.env.NEWSLETTER_FROM?.trim();
  if (!from) return emailSender();
  return from.includes("<") ? from : `Kolor Sensu <${from}>`;
}

const segmentId = () =>
  process.env.RESEND_NEWSLETTER_SEGMENT_ID?.trim() || undefined;

async function renderIssue(
  issue: NewsletterIssueDraft,
  unsubscribeUrl: string | null,
): Promise<RenderedNewsletterIssue> {
  const origin = siteUrl();
  const [articles, ebooks, { company }] = await Promise.all([
    getArticles(),
    getEbooks(),
    getSiteFrame(),
  ]);
  return renderNewsletterIssue(
    {
      subject: issue.subject || "(bez tematu)",
      previewText: issue.previewText,
      number: null,
      intro: issue.intro,
      cards: newsletterCards(issue.items, {
        articles,
        ebooks,
        imageUrl: articleImageUrl,
        origin,
      }),
      closing: issue.closing,
    },
    {
      origin,
      unsubscribeUrl,
      webUrl: issue.inArchive ? `${origin}/newsletter` : null,
      company,
    },
  );
}

/** The draft as the e-mail will look (no unsubscribe link yet). */
export function previewNewsletterIssue(draft: NewsletterIssueDraft) {
  return renderIssue(draft, null);
}

/** The draft to one address (the admin's own), marked as a test. */
export async function sendNewsletterTest(
  draft: NewsletterIssueDraft,
  to: string,
): Promise<void> {
  const rendered = await renderIssue(draft, null);
  await sendEmail(
    {
      from: newsletterSender(),
      to,
      subject: `[Test] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    },
    `newsletter-test-${crypto.randomUUID()}`,
  );
}

export function sendIssueAsAdmin(
  asAdmin: Client,
  id: string,
  sendAt: string | null,
): Promise<SendOutcome> {
  return sendNewsletterIssue(id, sendAt, {
    load: (issueId) => getNewsletterIssue(asAdmin, issueId),
    claim: (issueId, at) => claimNewsletterIssue(asAdmin, issueId, at),
    render: (issue: NewsletterIssue) =>
      renderIssue(issue, RESEND_UNSUBSCRIBE_URL),
    sync: syncNewsletterNow,
    async broadcast(issue, at) {
      const { data, error } = await resend().broadcasts.create({
        segmentId: segmentId()!,
        from: newsletterSender(),
        subject: issue.subject,
        previewText: issue.preview || undefined,
        html: issue.html,
        text: issue.text,
        name: issue.name.slice(0, 200),
        send: true,
        ...(at ? { scheduledAt: at } : {}),
      });
      if (error || !data) {
        throw new Error(`Resend: ${error?.message ?? "no data"}`);
      }
      return data.id;
    },
    finish: (issueId, broadcastId) =>
      finishNewsletterIssue(asAdmin, issueId, broadcastId),
    release: (issueId) => releaseNewsletterIssue(asAdmin, issueId),
    segmentId: segmentId(),
  });
}

export function cancelIssueAsAdmin(asAdmin: Client, id: string) {
  return cancelNewsletterIssue(id, {
    load: (issueId) => getNewsletterIssue(asAdmin, issueId),
    async cancel(broadcastId) {
      const { error } = await resend().broadcasts.cancel(broadcastId);
      if (error) throw new Error(`Resend: ${error.message}`);
    },
    unschedule: (issueId) => unscheduleNewsletterIssue(asAdmin, issueId),
  });
}
