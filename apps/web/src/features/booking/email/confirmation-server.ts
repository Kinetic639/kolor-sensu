import {
  claimBookingEmail,
  markBookingEmailSent,
  releaseBookingEmail,
} from "@repo/supabase";
import { emailSender, sendEmail } from "@/lib/email";
import { getBookingWindow } from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import { createSecretClient } from "@/lib/supabase/secret";
import {
  sendConfirmationEmail,
  type ConfirmationEmailDeps,
} from "./send-confirmation";

// The confirmation e-mail's real dependencies (server only).

/** The site's own address, for links in e-mails. */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

async function confirmationDeps(): Promise<ConfirmationEmailDeps> {
  const db = createSecretClient();
  const [{ contact }, window] = await Promise.all([
    getSiteFrame(),
    getBookingWindow(),
  ]);
  return {
    claim: (reference) => claimBookingEmail(db, reference, "confirmation"),
    markSent: (reference, id) =>
      markBookingEmailSent(db, reference, "confirmation", id),
    release: (reference) => releaseBookingEmail(db, reference, "confirmation"),
    send: sendEmail,
    from: emailSender(),
    siteUrl: siteUrl(),
    timeZone: window?.timeZone ?? "Europe/Warsaw",
    contact: { phone: contact?.phoneLabel, email: contact?.email },
  };
}

/** Sends the visit's confirmation if nobody has; never throws. */
export async function sendVisitConfirmation(reference: string) {
  try {
    return await sendConfirmationEmail(reference, await confirmationDeps());
  } catch (error) {
    console.error(`[booking] confirmation e-mail ${reference}:`, error);
    return "failed" as const;
  }
}
