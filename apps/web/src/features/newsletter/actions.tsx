"use server";

import {
  confirmNewsletterSubscription,
  markNewsletterConfirmationSent,
  requestNewsletterSubscription,
} from "@repo/supabase/newsletter";
import { render } from "@react-email/components";
import { headers } from "next/headers";
import {
  clientIp,
  turnstileKeys,
  verifyTurnstile,
  visitorKey,
} from "@/features/booking/guards";
import { ConfirmationEmail } from "@/features/booking/email/confirmation-email";
import { withCompany } from "@/features/booking/email/confirmation-content";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { emailSender, sendEmail } from "@/lib/email";
import { getCompany } from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import { createSecretClient } from "@/lib/supabase/secret";
import type {
  NewsletterConfirmResult,
  NewsletterResult,
} from "./newsletter-shared";
import { syncNewsletterNow } from "./server";
import { hashToken, subscribeToNewsletter } from "./subscribe";
import { NEWSLETTER_TAG } from "./webhook";

// The newsletter's Server Actions (useActionState): signing up (with the
// database, Turnstile and Resend behind it, subscribe.ts) and confirming
// with the link's token, after which the address is copied to Resend at
// once (the schedule retries if that fails).

export async function subscribeToNewsletterAction(
  _previous: NewsletterResult,
  form: FormData,
): Promise<NewsletterResult> {
  const ip = clientIp(await headers());
  const client = createSecretClient();
  const [company, { company: companyLine }] = await Promise.all([
    getCompany(),
    getSiteFrame(),
  ]);
  return subscribeToNewsletter(form, {
    verify: (token) => verifyTurnstile(token, ip, turnstileKeys().secretKey),
    senderKey: visitorKey(ip, process.env.SUPABASE_SECRET_KEY ?? ""),
    controller: company?.legalName ?? "Kolor Sensu",
    siteUrl: siteUrl(),
    save: (request) => requestNewsletterSubscription(client, request),
    markSent: (email) => markNewsletterConfirmationSent(client, email),
    send: async (to, content, idempotencyKey) => {
      await sendEmail(
        {
          from: emailSender(),
          to,
          subject: content.subject,
          html: await render(
            <ConfirmationEmail company={companyLine} content={content} />,
          ),
          text: withCompany(content.text, companyLine),
          tags: [NEWSLETTER_TAG],
        },
        idempotencyKey,
      );
    },
  });
}

export async function confirmNewsletterAction(
  _previous: NewsletterConfirmResult,
  form: FormData,
): Promise<NewsletterConfirmResult> {
  const token = String(form.get("token") ?? "");
  if (!token || token.length > 200) return { status: "unknown" };
  let confirmation;
  try {
    confirmation = await confirmNewsletterSubscription(
      createSecretClient(),
      hashToken(token),
    );
  } catch (error) {
    console.error("[newsletter] confirming failed:", error);
    return { status: "failed" };
  }
  if (confirmation.outcome === "confirmed") {
    try {
      await syncNewsletterNow();
    } catch (error) {
      console.error("[newsletter] copying to Resend failed:", error);
    }
  }
  return { status: confirmation.outcome };
}
