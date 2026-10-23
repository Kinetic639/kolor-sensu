import { render } from "@react-email/components";
import {
  claimWorkshopEmail,
  markWorkshopEmailSent,
  releaseWorkshopEmail,
  type ClaimedWorkshopEmail,
  type WorkshopEmailKind,
} from "@repo/supabase/workshops";
import { after } from "next/server";
import { withCompany } from "@/features/booking/email/confirmation-content";
import { ConfirmationEmail } from "@/features/booking/email/confirmation-email";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { emailSender, sendEmail } from "@/lib/email";
import { getBookingWindow } from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import { createSecretClient } from "@/lib/supabase/secret";
import { WITH_CALENDAR, workshopEmailContent } from "./content";

// Sending a workshop's e-mails (server only): claimed in the database
// first, so the webhook and the return page never both send one; Resend's
// idempotency key guards a retry of the same send. A failure gives the
// claim back and never fails the payment or the step around it.

async function basics() {
  const [{ contact, company }, window] = await Promise.all([
    getSiteFrame(),
    getBookingWindow(),
  ]);
  return {
    from: emailSender(),
    siteUrl: siteUrl(),
    timeZone: window?.timeZone ?? "Europe/Warsaw",
    contact: { phone: contact?.phoneLabel, email: contact?.email },
    company,
  };
}

async function deliver(
  email: ClaimedWorkshopEmail,
  kind: WorkshopEmailKind,
): Promise<"sent" | "failed"> {
  const db = createSecretClient();
  try {
    const options = await basics();
    const content = workshopEmailContent(kind, email, options);
    const { id } = await sendEmail(
      {
        from: options.from,
        to: email.clientEmail,
        subject: content.subject,
        html: await render(
          <ConfirmationEmail company={options.company} content={content} />,
        ),
        text: withCompany(content.text, options.company),
        attachments: !WITH_CALENDAR.has(kind)
          ? []
          : [
              {
                filename: `warsztat-${email.reference}.ics`,
                contentType: "text/calendar; charset=utf-8; method=PUBLISH",
                content: content.ics,
              },
            ],
      },
      `workshop-${kind}:${email.reference}:${email.manageToken.slice(0, 16)}`,
    );
    await markWorkshopEmailSent(db, email.reference, kind, id);
    return "sent";
  } catch (error) {
    console.error(
      `[workshops] ${kind} e-mail ${email.reference} failed:`,
      error,
    );
    await releaseWorkshopEmail(db, email.reference, kind).catch(
      () => undefined,
    );
    return "failed";
  }
}

/** Sends the registration's e-mail of this kind if nobody has; never throws. */
export async function sendWorkshopEmail(
  reference: string,
  kind: WorkshopEmailKind,
): Promise<"sent" | "skipped" | "failed"> {
  try {
    const email = await claimWorkshopEmail(
      createSecretClient(),
      reference,
      kind,
    );
    if (!email) return "skipped";
    return await deliver(email, kind);
  } catch (error) {
    console.error(`[workshops] ${kind} e-mail ${reference}:`, error);
    return "failed";
  }
}

/**
 * Claims the e-mail now and sends it after the response: the claim brings
 * the link's token, so the guest goes straight to the registration's page
 * by the same link the e-mail carries. Null when there is nothing to send.
 */
export async function claimWorkshopEmailLink(
  reference: string,
  kind: WorkshopEmailKind,
): Promise<string | null> {
  try {
    const email = await claimWorkshopEmail(
      createSecretClient(),
      reference,
      kind,
    );
    if (!email) return null;
    after(() => deliver(email, kind));
    return email.manageToken;
  } catch (error) {
    console.error(`[workshops] ${kind} e-mail ${reference}:`, error);
    return null;
  }
}
