import type { NewsletterSource } from "@repo/contracts/newsletter";
import {
  markNewsletterConfirmationSent,
  requestNewsletterSubscription,
} from "@repo/supabase/newsletter";
import { render } from "@react-email/components";
import { withCompany } from "@/features/booking/email/confirmation-content";
import { ConfirmationEmail } from "@/features/booking/email/confirmation-email";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { visitorKey } from "@/features/booking/guards";
import { emailSender, sendEmail } from "@/lib/email";
import { getCompany } from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import { createSecretClient } from "@/lib/supabase/secret";
import type { NewsletterConfirmationContent } from "./confirmation-email";
import { requestNewsletterSignup, type SubscribeDeps } from "./subscribe";
import { NEWSLETTER_TAG } from "./webhook";

// What signing up needs on the site's server, for the newsletter's forms
// and for booking (its "Chcę dostawać newsletter"): the database, who
// handles the data (named in the consent), and the e-mails in the visit
// e-mails' look, labelled as the newsletter's for Resend's webhook.

/** Sends one of the newsletter's own e-mails (the link, the welcome). */
export async function sendNewsletterEmail(
  to: string,
  content: NewsletterConfirmationContent,
  idempotencyKey: string,
) {
  const { company } = await getSiteFrame();
  await sendEmail(
    {
      from: emailSender(),
      to,
      subject: content.subject,
      html: await render(
        <ConfirmationEmail company={company} content={content} />,
      ),
      text: withCompany(content.text, company),
      tags: [NEWSLETTER_TAG],
    },
    idempotencyKey,
  );
}

export async function newsletterSignupDeps(
  ip: string,
): Promise<Omit<SubscribeDeps, "verify">> {
  const client = createSecretClient();
  const company = await getCompany();
  return {
    senderKey: visitorKey(ip, process.env.SUPABASE_SECRET_KEY ?? ""),
    controller: company?.legalName ?? "Kolor Sensu",
    siteUrl: siteUrl(),
    save: (request) => requestNewsletterSubscription(client, request),
    markSent: (email) => markNewsletterConfirmationSent(client, email),
    send: sendNewsletterEmail,
  };
}

/** Who handles the data, as the consent names them. */
export async function newsletterController(): Promise<string> {
  return (await getCompany())?.legalName ?? "Kolor Sensu";
}

/** A sign-up a person asked for outside the form (booking a visit). */
export async function signUpForNewsletter(
  email: string,
  source: NewsletterSource,
  ip: string,
) {
  return requestNewsletterSignup(email, source, await newsletterSignupDeps(ip));
}
