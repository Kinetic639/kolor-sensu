import {
  claimBookingEmail,
  markBookingEmailSent,
  releaseBookingEmail,
  type BookingEmailKind,
} from "@repo/supabase";
import { after } from "next/server";
import { emailSender, sendEmail } from "@/lib/email";
import { getBookingWindow } from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import { createSecretClient } from "@/lib/supabase/secret";
import { sendChangeEmail, type VisitChange } from "./send-change";
import { sendSlotLostEmail } from "./send-slot-lost";
import type { SlotLostEmail } from "./slot-lost-content";
import {
  deliverVisitEmail,
  sendVisitEmail,
  type VisitEmailKind,
} from "./send-visit-email";
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

/** What every visit e-mail needs: the sender, the site, the centre. */
async function emailBasics() {
  const [{ contact, company }, window] = await Promise.all([
    getSiteFrame(),
    getBookingWindow(),
  ]);
  return {
    send: sendEmail,
    from: emailSender(),
    siteUrl: siteUrl(),
    timeZone: window?.timeZone ?? "Europe/Warsaw",
    contact: { phone: contact?.phoneLabel, email: contact?.email },
    company,
  };
}

async function confirmationDeps(): Promise<ConfirmationEmailDeps> {
  const db = createSecretClient();
  return {
    ...(await emailBasics()),
    claim: (reference) => claimBookingEmail(db, reference, "confirmation"),
    markSent: (reference, id) =>
      markBookingEmailSent(db, reference, "confirmation", id),
    release: (reference) => releaseBookingEmail(db, reference, "confirmation"),
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

/** What every claimed e-mail needs from the database. */
function claims() {
  const db = createSecretClient();
  return {
    claim: (reference: string, kind: BookingEmailKind) =>
      claimBookingEmail(db, reference, kind),
    markSent: (reference: string, kind: BookingEmailKind, id: string) =>
      markBookingEmailSent(db, reference, kind, id),
    release: (reference: string, kind: BookingEmailKind) =>
      releaseBookingEmail(db, reference, kind),
  };
}

/**
 * Sends one of the visit's own e-mails (a reservation with the link to pay,
 * a reminder, a cancellation for want of payment) if nobody has; never
 * throws.
 */
export async function sendVisitEmailOnce(
  reference: string,
  kind: VisitEmailKind,
) {
  try {
    return await sendVisitEmail(reference, kind, {
      ...(await emailBasics()),
      ...claims(),
    });
  } catch (error) {
    console.error(`[booking] ${kind} e-mail ${reference}:`, error);
    return "failed" as const;
  }
}

/**
 * Claims the reservation's e-mail now and sends it after the response:
 * the claim brings the link's token, so the client goes straight to the
 * visit's page by the same link the e-mail carries. Null when there is
 * nothing to send.
 */
export async function claimReservationEmail(
  reference: string,
): Promise<string | null> {
  const basics = await emailBasics();
  const db = claims();
  const visit = await db.claim(reference, "reserved");
  if (!visit?.manageToken) return null;
  after(() => deliverVisitEmail(visit, "reserved", { ...basics, ...db }));
  return visit.manageToken;
}

/** Sends the e-mail about a change (a new time, a cancellation); never throws. */
export async function sendVisitChangeEmail(change: VisitChange) {
  try {
    return await sendChangeEmail(change, {
      ...(await emailBasics()),
      ...claims(),
    });
  } catch (error) {
    console.error(
      `[booking] ${change.kind} e-mail ${change.reference}:`,
      error,
    );
    return "failed" as const;
  }
}

/**
 * Tells the client their payment came after the time was taken and went
 * back (Klient · 4, card 17); never throws.
 */
export async function sendSlotLostNotice(
  payment: SlotLostEmail & { to: string; sessionId: string },
) {
  try {
    await sendSlotLostEmail(payment, await emailBasics());
    return "sent" as const;
  } catch (error) {
    console.error(`[booking] slot-lost e-mail ${payment.reference}:`, error);
    return "failed" as const;
  }
}
