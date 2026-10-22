import type { Database } from "@repo/contracts/database";
import type {
  NewsletterSource,
  NewsletterStatus,
  NewsletterStopReason,
  NewsletterSubscriber,
} from "@repo/contracts/newsletter";
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
  /** "active": copy it to Resend; "removing": delete it there, then here. */
  status: "active" | "removing";
}

export async function newsletterContactsToSync(
  client: Client,
): Promise<NewsletterContactToSync[]> {
  const { data, error } = await client.rpc("newsletter_contacts_to_sync");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status as "active" | "removing",
  }));
}

export async function markNewsletterSynced(
  client: Client,
  id: string,
  contactId: string,
): Promise<void> {
  const { error } = await client.rpc("mark_newsletter_synced", {
    p_id: id,
    p_contact_id: contactId,
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
