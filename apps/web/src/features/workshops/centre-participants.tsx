import { render } from "@react-email/components";
import type {
  WorkshopMessageRequest,
  WorkshopParticipantRequest,
} from "@repo/contracts/workshops";
import { createSupabasePublicClient } from "@repo/supabase/public";
import {
  centreAddWorkshopParticipant,
  recordWorkshopMessage,
  WorkshopAdminError,
} from "@repo/supabase/workshops-admin";
import { after } from "next/server";
import {
  contactLineOf,
  withCompany,
} from "@/features/booking/email/confirmation-content";
import { ConfirmationEmail } from "@/features/booking/email/confirmation-email";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { emailSender, sendEmail } from "@/lib/email";
import { getBookingWindow } from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";
import { createSecretClient } from "@/lib/supabase/secret";
import { sendWorkshopEmail } from "./email/send";
import { workshopDateLabel, workshopTimeLabel } from "./workshop-view";

// The portal's changes to a workshop's participants that need the site
// (docs/product/workshops-plan.md, PR 6): adding someone (they get their
// confirmation, or the link to pay) and writing to everyone signed up.
// The database checks the admin's role (their access token).

function asAdmin(accessToken: string) {
  return createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    accessToken,
  );
}

export async function addParticipantAsCentre(
  workshopId: string,
  participant: WorkshopParticipantRequest,
  accessToken: string,
): Promise<
  { ok: true; reference: string; status: string } | { ok: false; code: string }
> {
  try {
    const added = await centreAddWorkshopParticipant(
      asAdmin(accessToken),
      workshopId,
      participant,
    );
    after(() =>
      sendWorkshopEmail(
        added.reference,
        added.status === "confirmed" ? "confirmation" : "reserved",
      ),
    );
    return { ok: true, ...added };
  } catch (error) {
    if (error instanceof WorkshopAdminError)
      return { ok: false, code: error.code };
    throw error;
  }
}

/** The admin's message, sent to everyone signed up; how many it went to. */
export async function messageAsCentre(
  workshopId: string,
  message: WorkshopMessageRequest,
  accessToken: string,
): Promise<
  { ok: true; sent: number; failed: number } | { ok: false; code: string }
> {
  let recorded;
  try {
    recorded = await recordWorkshopMessage(
      asAdmin(accessToken),
      workshopId,
      message.subject,
      message.body,
    );
  } catch (error) {
    if (error instanceof WorkshopAdminError)
      return { ok: false, code: error.code };
    throw error;
  }
  const { data: workshop } = await createSecretClient()
    .from("workshops")
    .select("title, slug, starts_at, ends_at")
    .eq("id", workshopId)
    .single();
  const [{ contact, company }, window] = await Promise.all([
    getSiteFrame(),
    getBookingWindow(),
  ]);
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const when = workshop
    ? `${workshopDateLabel(workshop.starts_at, timeZone)}, ${workshopTimeLabel(workshop.starts_at, workshop.ends_at, timeZone)}`
    : "";
  const url = `${siteUrl()}/warsztaty/${workshop?.slug ?? ""}`;
  const contactLine = contactLineOf({
    phone: contact?.phoneLabel,
    email: contact?.email,
  });

  let sent = 0;
  let failed = 0;
  for (const person of recorded.recipients) {
    const greeting = `Dzień dobry${person.name ? `, ${person.name}` : ""}!`;
    const rows: [string, string][] = workshop
      ? [
          ["Warsztat", workshop.title],
          ["Termin", when],
        ]
      : [];
    const content = {
      subject: message.subject,
      preview: message.subject,
      heading: message.subject,
      greeting,
      intro: message.body,
      rows,
      manageUrl: url,
      buttonLabel: "O warsztacie",
      note: null,
      contactLine,
      text: [
        greeting,
        "",
        message.body,
        "",
        ...rows.map(([label, value]) => `${label}: ${value}`),
        "",
        url,
      ].join("\n"),
      ics: "",
    };
    try {
      await sendEmail(
        {
          from: emailSender(),
          to: person.email,
          subject: message.subject,
          html: await render(
            <ConfirmationEmail company={company} content={content} />,
          ),
          text: withCompany(content.text, company),
        },
        `workshop-message:${recorded.messageId}:${person.reference}`,
      );
      sent += 1;
    } catch (error) {
      console.error(
        `[workshops] message to ${person.reference} failed:`,
        error,
      );
      failed += 1;
    }
  }
  return { ok: true, sent, failed };
}
