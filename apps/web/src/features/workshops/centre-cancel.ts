import {
  cancelWorkshop,
  centreCancelWorkshopParticipant,
  WorkshopAdminError,
} from "@repo/supabase/workshops-admin";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { after } from "next/server";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";
import { createSecretClient } from "@/lib/supabase/secret";
import { sendWorkshopEmail } from "./email/send";
import { refundRegistration } from "./refunds";

// The centre cancels a workshop or one participant (docs/product/
// workshops-plan.md, PR 2 and 6): the database (as the admin, who must be
// one) cancels and says who is owed what; the money goes back through
// Stripe here, where the payments live, and each participant hears of it.
// A refund that fails stays owed in the database (the scheduled job tries
// again) and is reported.

export interface CentreCancelOutcome {
  ok: true;
  refunded: number;
  refundFailed: boolean;
}

function asAdmin(accessToken: string) {
  return createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    accessToken,
  );
}

async function refundAndTell(
  seats: { registrationId: string; reference: string; refundMinor: number }[],
): Promise<CentreCancelOutcome> {
  const db = createSecretClient();
  let refunded = 0;
  let refundFailed = false;
  for (const seat of seats) {
    try {
      if (seat.refundMinor > 0) {
        await refundRegistration(
          db,
          { id: seat.registrationId, reference: seat.reference },
          seat.refundMinor,
          "cancelled",
        );
      }
      refunded += 1;
    } catch (error) {
      console.error(`[workshops] refund for ${seat.reference} failed:`, error);
      refundFailed = true;
    }
  }
  return { ok: true, refunded, refundFailed };
}

export async function cancelWorkshopAsCentre(
  workshopId: string,
  reason: string | null,
  accessToken: string,
): Promise<CentreCancelOutcome | { ok: false; code: string }> {
  let owed;
  try {
    owed = await cancelWorkshop(asAdmin(accessToken), workshopId, reason);
  } catch (error) {
    if (error instanceof WorkshopAdminError)
      return { ok: false, code: error.code };
    throw error;
  }
  const outcome = await refundAndTell(owed);
  // Everyone signed up hears of it (also those with nothing to refund),
  // through the e-mails the cancellation made due.
  after(() => sendDueCancellations());
  return outcome;
}

/** The admin cancels one participant, giving back what they chose. */
export async function cancelParticipantAsCentre(
  registrationId: string,
  refundMinor: number,
  accessToken: string,
): Promise<CentreCancelOutcome | { ok: false; code: string }> {
  let seat;
  try {
    seat = await centreCancelWorkshopParticipant(
      asAdmin(accessToken),
      registrationId,
      refundMinor,
    );
  } catch (error) {
    if (error instanceof WorkshopAdminError)
      return { ok: false, code: error.code };
    throw error;
  }
  const outcome = await refundAndTell([{ registrationId, ...seat }]);
  after(() => sendWorkshopEmail(seat.reference, "cancelled"));
  return outcome;
}

/** The cancellations' e-mails, now rather than at the next scheduled run. */
async function sendDueCancellations() {
  const { listDueWorkshopEmails } = await import("@repo/supabase/workshops");
  const due = await listDueWorkshopEmails(createSecretClient()).catch(() => []);
  for (const { reference, kind } of due) {
    if (kind === "cancelled") await sendWorkshopEmail(reference, kind);
  }
}
