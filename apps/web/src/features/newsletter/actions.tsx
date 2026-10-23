"use server";

import {
  confirmNewsletterSubscription,
  unsubscribeNewsletter,
} from "@repo/supabase/newsletter";
import { headers } from "next/headers";
import {
  clientIp,
  turnstileKeys,
  verifyTurnstile,
} from "@/features/booking/guards";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { createSecretClient } from "@/lib/supabase/secret";
import { newsletterWelcomeContent } from "./confirmation-email";
import type {
  NewsletterConfirmResult,
  NewsletterResult,
  NewsletterUnsubscribeResult,
} from "./newsletter-shared";
import { syncNewsletterNow } from "./server";
import { newsletterSignupDeps, sendNewsletterEmail } from "./signup-server";
import { hashToken, subscribeToNewsletter } from "./subscribe";
import { isUnsubscribeCode } from "./unsubscribe-code";

// The newsletter's Server Actions (useActionState): signing up (with the
// database, Turnstile and Resend behind it, subscribe.ts) and confirming
// with the link's token, after which the welcome goes out and the address
// is copied to Resend at once (the schedule retries if that fails); and
// unsubscribing with the code from an issue's link: off the list here at
// once, then unsubscribed in Resend too (the schedule retries that too).

export async function subscribeToNewsletterAction(
  _previous: NewsletterResult,
  form: FormData,
): Promise<NewsletterResult> {
  const ip = clientIp(await headers());
  return subscribeToNewsletter(form, {
    ...(await newsletterSignupDeps(ip)),
    verify: (token) => verifyTurnstile(token, ip, turnstileKeys().secretKey),
  });
}

export async function confirmNewsletterAction(
  _previous: NewsletterConfirmResult,
  form: FormData,
): Promise<NewsletterConfirmResult> {
  const token = String(form.get("token") ?? "");
  if (!token || token.length > 200) return { status: "unknown" };
  const tokenHash = hashToken(token);
  let confirmation;
  try {
    confirmation = await confirmNewsletterSubscription(
      createSecretClient(),
      tokenHash,
    );
  } catch (error) {
    console.error("[newsletter] confirming failed:", error);
    return { status: "failed" };
  }
  if (confirmation.outcome === "confirmed") {
    await Promise.all([
      sendNewsletterEmail(
        confirmation.email,
        newsletterWelcomeContent(siteUrl()),
        `newsletter-welcome-${tokenHash.slice(0, 32)}`,
      ).catch((error: unknown) => {
        console.error("[newsletter] the welcome e-mail failed:", error);
      }),
      syncNewsletterNow().catch((error: unknown) => {
        console.error("[newsletter] copying to Resend failed:", error);
      }),
    ]);
  }
  return { status: confirmation.outcome };
}

export async function unsubscribeNewsletterAction(
  _previous: NewsletterUnsubscribeResult,
  form: FormData,
): Promise<NewsletterUnsubscribeResult> {
  const code = String(form.get("kod") ?? "");
  if (!isUnsubscribeCode(code)) return { status: "unknown" };
  let result;
  try {
    result = await unsubscribeNewsletter(createSecretClient(), code);
  } catch (error) {
    console.error("[newsletter] unsubscribing failed:", error);
    return { status: "failed" };
  }
  if (result.outcome === "stopped") {
    await syncNewsletterNow().catch((error: unknown) => {
      console.error("[newsletter] unsubscribing in Resend failed:", error);
    });
  }
  return { status: result.outcome };
}
