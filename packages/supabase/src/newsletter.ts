import type { Database, Json } from "@repo/contracts/database";
import type {
  NewsletterSource,
  NewsletterStatus,
  NewsletterStopReason,
  NewsletterSubscriber,
} from "@repo/contracts/newsletter";
import {
  readNewsletterContent,
  type NewsletterArchiveIssue,
  type NewsletterIssue,
  type NewsletterIssueDraft,
  type NewsletterIssueRow,
  type NewsletterIssueStatus,
} from "@repo/contracts/newsletter-issue";
import type { SupabaseClient } from "@supabase/supabase-js";

// The newsletter (docs/architecture/newsletter-domain.md, migration
// 20261022120000_newsletter.sql). The site's server (the service-role
// client) signs people up, confirms them, brings Resend up to date and
// records what Resend reports; the admin lists and removes addresses
// through the database's functions, which check the role.

type Client = SupabaseClient<Database>;

/** The database refused the sign-up: too many from this visitor just now. */
export class NewsletterRateLimitedError extends Error {
  constructor() {
    super("newsletter_rate_limited");
    this.name = "NewsletterRateLimitedError";
  }
}

// ------------------------------------------------------------ the site

export interface NewsletterRequest {
  email: string;
  source: NewsletterSource;
  consentText: string;
  consentVersion: string;
  /** A keyed hash of the visitor's IP address. */
  senderKey: string;
  /** The SHA-256 (hex) of the confirmation link's token. */
  tokenHash: string;
}

/**
 * A sign-up: "send" (send the link), "wait" (a link went out just now) or
 * "active" (already subscribed).
 */
export async function requestNewsletterSubscription(
  client: Client,
  request: NewsletterRequest,
): Promise<"send" | "wait" | "active"> {
  const { data, error } = await client.rpc("request_newsletter_subscription", {
    p_email: request.email,
    p_source: request.source,
    p_consent_text: request.consentText,
    p_consent_version: request.consentVersion,
    p_sender_key: request.senderKey,
    p_token_hash: request.tokenHash,
  });
  if (error) {
    if (error.message.includes("newsletter_rate_limited")) {
      throw new NewsletterRateLimitedError();
    }
    throw error;
  }
  return data as "send" | "wait" | "active";
}

export async function markNewsletterConfirmationSent(
  client: Client,
  email: string,
): Promise<void> {
  const { error } = await client.rpc("mark_newsletter_confirmation_sent", {
    p_email: email,
  });
  if (error) throw error;
}

export type NewsletterConfirmation =
  { outcome: "confirmed" | "already"; email: string } | { outcome: "unknown" };

export async function confirmNewsletterSubscription(
  client: Client,
  tokenHash: string,
): Promise<NewsletterConfirmation> {
  const { data, error } = await client.rpc("confirm_newsletter_subscription", {
    p_token_hash: tokenHash,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row || row.outcome === "unknown" || !row.email) {
    return { outcome: "unknown" };
  }
  return {
    outcome: row.outcome as "confirmed" | "already",
    email: row.email,
  };
}

export interface NewsletterContactToSync {
  id: string;
  email: string;
  /**
   * "active": copy it to Resend; "unsubscribed": unsubscribe it there too;
   * "removing": delete it there, then here.
   */
  status: "active" | "unsubscribed" | "removing";
  /** The code in its unsubscribe link (kept in Resend with the contact). */
  unsubscribeToken: string;
}

export async function newsletterContactsToSync(
  client: Client,
): Promise<NewsletterContactToSync[]> {
  const { data, error } = await client.rpc("newsletter_contacts_to_sync");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status as NewsletterContactToSync["status"],
    unsubscribeToken: row.unsubscribe_token,
  }));
}

export async function markNewsletterSynced(
  client: Client,
  id: string,
  contactId: string | null,
): Promise<void> {
  const { error } = await client.rpc("mark_newsletter_synced", {
    p_id: id,
    // null keeps the id it has (an unsubscribe brought to Resend).
    p_contact_id: contactId as string,
  });
  if (error) throw error;
}

export async function finishNewsletterRemoval(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("finish_newsletter_removal", {
    p_id: id,
  });
  if (error) throw error;
}

/** Resend reports the address stopped; true when it was on the list. */
/** The address behind an unsubscribe link, if the code is known. */
export async function findNewsletterUnsubscribe(
  client: Client,
  token: string,
): Promise<{ email: string; status: NewsletterStatus } | null> {
  const { data, error } = await client.rpc("find_newsletter_unsubscribe", {
    p_token: token,
  });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? { email: row.email, status: row.status as NewsletterStatus }
    : null;
}

export type NewsletterUnsubscribeOutcome = "stopped" | "already" | "unknown";

/** The unsubscribe page's button: the address is off the list here. */
export async function unsubscribeNewsletter(
  client: Client,
  token: string,
): Promise<{ outcome: NewsletterUnsubscribeOutcome; email: string | null }> {
  const { data, error } = await client.rpc("unsubscribe_newsletter", {
    p_token: token,
  });
  if (error) throw error;
  const row = data?.[0];
  return {
    outcome: (row?.outcome ?? "unknown") as NewsletterUnsubscribeOutcome,
    email: row?.email ?? null,
  };
}

export async function stopNewsletterSubscription(
  client: Client,
  email: string,
  reason: NewsletterStopReason,
): Promise<boolean> {
  const { data, error } = await client.rpc("stop_newsletter_subscription", {
    p_email: email,
    p_reason: reason,
  });
  if (error) throw error;
  return data === true;
}

// ------------------------------------------------------------ the admin

export async function listNewsletterSubscribers(
  client: Client,
): Promise<NewsletterSubscriber[]> {
  const { data, error } = await client.rpc("list_newsletter_subscribers");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status as NewsletterStatus,
    source: row.source as NewsletterSource,
    consentVersion: row.consent_version,
    requestedAt: row.requested_at,
    confirmedAt: row.confirmed_at,
    stoppedAt: row.stopped_at,
    stopReason: row.stop_reason as NewsletterStopReason | null,
    synced: row.synced,
  }));
}

export interface NewsletterConsent {
  email: string;
  consentText: string;
  consentVersion: string;
  requestedAt: string;
  confirmedAt: string | null;
}

export async function getNewsletterConsent(
  client: Client,
  id: string,
): Promise<NewsletterConsent | null> {
  const { data, error } = await client.rpc("get_newsletter_consent", {
    p_id: id,
  });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? {
        email: row.email,
        consentText: row.consent_text,
        consentVersion: row.consent_version,
        requestedAt: row.requested_at,
        confirmedAt: row.confirmed_at,
      }
    : null;
}

export async function removeNewsletterSubscriber(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("remove_newsletter_subscriber", {
    p_id: id,
  });
  if (error) throw error;
}

// ------------------------------------------------------------ issues

const toIssueRow = (row: {
  id: string;
  number: number | null;
  subject: string;
  status: string;
  send_at: string | null;
  recipients: number | null;
  stopped_after: number | null;
  in_archive: boolean;
  updated_at: string;
}): NewsletterIssueRow => ({
  id: row.id,
  number: row.number,
  subject: row.subject,
  status: row.status as NewsletterIssueStatus,
  sendAt: row.send_at,
  recipients: row.recipients,
  stoppedAfter: row.stopped_after,
  inArchive: row.in_archive,
  updatedAt: row.updated_at,
});

export async function listNewsletterIssues(
  client: Client,
): Promise<NewsletterIssueRow[]> {
  const { data, error } = await client.rpc("list_newsletter_issues");
  if (error) throw error;
  return (data ?? []).map(toIssueRow);
}

export async function getNewsletterIssue(
  client: Client,
  id: string,
): Promise<NewsletterIssue | null> {
  const { data, error } = await client.rpc("get_newsletter_issue", {
    p_id: id,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    subject: row.subject,
    previewText: row.preview_text,
    ...readNewsletterContent(row),
    inArchive: row.in_archive,
    status: row.status as NewsletterIssueStatus,
    sendAt: row.send_at,
    broadcastId: row.broadcast_id,
    recipients: row.recipients,
    updatedAt: row.updated_at,
  };
}

export async function createNewsletterIssue(client: Client): Promise<string> {
  const { data, error } = await client.rpc("create_newsletter_issue");
  if (error) throw error;
  return data;
}

export async function saveNewsletterIssue(
  client: Client,
  id: string,
  draft: NewsletterIssueDraft,
): Promise<void> {
  const { error } = await client.rpc("save_newsletter_issue", {
    p_id: id,
    p_subject: draft.subject,
    p_preview_text: draft.previewText,
    p_intro: draft.intro as unknown as Json,
    p_items: draft.items as unknown as Json,
    p_closing: draft.closing as unknown as Json,
    p_in_archive: draft.inArchive,
  });
  if (error) throw error;
}

export async function setNewsletterIssueArchive(
  client: Client,
  id: string,
  inArchive: boolean,
): Promise<void> {
  const { error } = await client.rpc("set_newsletter_issue_archive", {
    p_id: id,
    p_in_archive: inArchive,
  });
  if (error) throw error;
}

export async function deleteNewsletterIssue(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("delete_newsletter_issue", { p_id: id });
  if (error) throw error;
}

/** Sending, step 1: the draft is taken; null sends now. */
export async function claimNewsletterIssue(
  client: Client,
  id: string,
  sendAt: string | null,
): Promise<void> {
  const { error } = await client.rpc("claim_newsletter_issue", {
    p_id: id,
    // A null time sends now (the database's default).
    p_send_at: sendAt as string,
  });
  if (error) throw error;
}

/** Sending, step 2: Resend has it; its number. */
export async function finishNewsletterIssue(
  client: Client,
  id: string,
  broadcastId: string,
): Promise<number> {
  const { data, error } = await client.rpc("finish_newsletter_issue", {
    p_id: id,
    p_broadcast_id: broadcastId,
  });
  if (error) throw error;
  return data;
}

/** Sending failed: the draft comes back. */
export async function releaseNewsletterIssue(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("release_newsletter_issue", { p_id: id });
  if (error) throw error;
}

/** A scheduled issue taken back (after Resend cancelled it). */
export async function unscheduleNewsletterIssue(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("unschedule_newsletter_issue", {
    p_id: id,
  });
  if (error) throw error;
}

/** The issues gone out and kept in the site's archive, newest first. */
export async function listNewsletterArchive(
  client: Client,
): Promise<NewsletterArchiveIssue[]> {
  const { data, error } = await client.rpc("list_newsletter_archive");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    number: row.number,
    subject: row.subject,
    previewText: row.preview_text,
    ...readNewsletterContent(row),
    sendAt: row.send_at,
  }));
}
