import { expect } from "@playwright/test";

// The link in a guest's e-mail, as the guest would open it: the e-mails a
// test sends are read back from Resend (the sent e-mails of the account
// that sends for DEV and STAGING), so the tests can go where only the
// e-mail leads (a visit's own page: paying later, moving, cancelling).
// The key is E2E_RESEND_API_KEY; without it those tests are skipped.

export const resendKey = process.env.E2E_RESEND_API_KEY;
export const missingResendKey =
  "E2E_RESEND_API_KEY is not set (the e-mails are read from Resend).";

const API = "https://api.resend.com";

interface SentEmail {
  id: string;
  to: string[];
  subject: string;
}

async function resend<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  if (!response.ok) {
    throw new Error(`Resend ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * The visit's own link (/wizyta/…) from the newest e-mail to `to` whose
 * subject has `subject` in it; waits for it to be sent.
 */
export async function visitLinkFromEmail(
  to: string,
  subject: string,
): Promise<string> {
  const html = await emailTo(to, subject);
  const link = /href="([^"]*\/wizyta\/[^"/?#]+)"/.exec(html)?.[1];
  if (!link) throw new Error(`The e-mail "${subject}" has no visit link.`);
  return link.replaceAll("&amp;", "&");
}

/**
 * The HTML of the newest e-mail to `to` whose subject has `subject` in it;
 * waits for it to be sent.
 */
export async function emailTo(to: string, subject: string): Promise<string> {
  let html = "";
  await expect
    .poll(
      async () => {
        const list = await resend<{ data: SentEmail[] }>("/emails?limit=50");
        const sent = list.data.find(
          (email) => email.to.includes(to) && email.subject.includes(subject),
        );
        if (!sent) return false;
        ({ html } = await resend<{ html: string }>(`/emails/${sent.id}`));
        return true;
      },
      {
        timeout: 90_000,
        intervals: [3_000],
        message: `No e-mail "${subject}" to ${to}`,
      },
    )
    .toBe(true);
  return html;
}
