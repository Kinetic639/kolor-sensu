import {
  NEWSLETTER_CONSENT_VERSION,
  newsletterConsentText,
  newsletterSignupSchema,
  type NewsletterSource,
} from "@repo/contracts/newsletter";
import { NewsletterRateLimitedError } from "@repo/supabase/newsletter";
import { createHash, randomBytes } from "node:crypto";
import {
  newsletterConfirmationContent,
  newsletterConfirmUrl,
  type NewsletterConfirmationContent,
} from "./confirmation-email";
import {
  NEWSLETTER_TRAP_FIELD,
  type NewsletterField,
  type NewsletterResult,
} from "./newsletter-shared";

// What happens when a visitor signs up for the newsletter (kept apart from
// Next so it can be tested): a filled hidden field means a bot (it is told
// "sent" and nothing is kept); the address and the consent are checked;
// Turnstile must pass; the sign-up is saved with the consent as shown,
// the database refusing a sixth within the hour from one visitor; then the
// link to confirm it goes out. The visitor gets the same answer whether the
// address was new, waiting or already subscribed (nobody learns who is on
// the list).

export interface SubscribeDeps {
  verify: (token: string) => Promise<boolean>;
  senderKey: string;
  /** Who handles the data, named in the consent. */
  controller: string;
  siteUrl: string;
  save: (request: {
    email: string;
    source: NewsletterSource;
    consentText: string;
    consentVersion: string;
    senderKey: string;
    tokenHash: string;
  }) => Promise<"send" | "wait" | "active">;
  markSent: (email: string) => Promise<void>;
  send: (
    email: string,
    content: NewsletterConfirmationContent,
    idempotencyKey: string,
  ) => Promise<void>;
  /** A new token for the link (random unless a test gives one). */
  token?: () => string;
}

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function subscribeToNewsletter(
  form: FormData,
  deps: SubscribeDeps,
): Promise<NewsletterResult> {
  const text = (name: string) => String(form.get(name) ?? "");
  const email = text("email");
  if (text(NEWSLETTER_TRAP_FIELD).trim()) return { status: "sent" };

  const parsed = newsletterSignupSchema.safeParse({
    email,
    consent: form.get("consent") === "on",
    source: text("source"),
  });
  if (!parsed.success) {
    const errors: Partial<Record<NewsletterField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "consent")
        errors[field] ??= issue.message;
    }
    if (!errors.email && !errors.consent) return { status: "failed", email };
    return { status: "invalid", errors, email };
  }

  if (!(await deps.verify(text("cf-turnstile-response")))) {
    return { status: "unverified", email };
  }

  const token = deps.token?.() ?? randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  let answer: "send" | "wait" | "active";
  try {
    answer = await deps.save({
      email: parsed.data.email,
      source: parsed.data.source,
      consentText: newsletterConsentText(deps.controller),
      consentVersion: NEWSLETTER_CONSENT_VERSION,
      senderKey: deps.senderKey,
      tokenHash,
    });
  } catch (error) {
    if (error instanceof NewsletterRateLimitedError) {
      return { status: "limited", email };
    }
    console.error("[newsletter] saving the sign-up failed:", error);
    return { status: "failed", email };
  }
  if (answer !== "send") return { status: "sent" };

  try {
    await deps.send(
      parsed.data.email,
      newsletterConfirmationContent(newsletterConfirmUrl(deps.siteUrl, token)),
      `newsletter-confirm-${tokenHash.slice(0, 32)}`,
    );
  } catch (error) {
    console.error("[newsletter] the confirmation e-mail failed:", error);
    return { status: "failed", email };
  }
  try {
    await deps.markSent(parsed.data.email);
  } catch (error) {
    console.error("[newsletter] recording the e-mail failed:", error);
  }
  return { status: "sent" };
}
