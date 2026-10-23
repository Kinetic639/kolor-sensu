import { cancelUnpaidVisits, listDueBookingEmails } from "@repo/supabase";
import {
  listDueWorkshopEmails,
  listOwedWorkshopRefunds,
  remindWorkshopMinimums,
  runWorkshopJobs as expireWorkshopSeats,
} from "@repo/supabase/workshops";
import { NextResponse } from "next/server";
import { sendVisitEmailOnce } from "@/features/booking/email/confirmation-server";
import { isCronRequest, runPaymentJobs } from "@/features/booking/payment-jobs";
import { checkStuckPayments } from "@/features/booking/payment-server";
import { sendWorkshopEmail } from "@/features/workshops/email/send";
import { runWorkshopJobs } from "@/features/workshops/jobs";
import { refundRegistration } from "@/features/workshops/refunds";
import { createSecretClient } from "@/lib/supabase/secret";

// Called by the database every 15 minutes (pg_cron + pg_net, migration
// payment_schedule): payments stuck pending are asked of Stripe, unpaid
// reservations are cancelled and the payment and visit reminders go out
// (R11). Then the workshops' part (features/workshops/jobs.ts): seats that
// ran out, minimums, owed refunds and the e-mails events call for.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequest(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createSecretClient();
  const result = await runPaymentJobs({
    checkStuck: checkStuckPayments,
    cancelUnpaid: () => cancelUnpaidVisits(db),
    listDue: () => listDueBookingEmails(db),
    send: sendVisitEmailOnce,
  });
  const workshops = await runWorkshopJobs({
    expire: () => expireWorkshopSeats(db),
    remindMinimums: () => remindWorkshopMinimums(db),
    listOwed: () => listOwedWorkshopRefunds(db),
    refund: (owed) =>
      refundRegistration(
        db,
        { id: owed.registrationId, reference: owed.reference },
        owed.owedMinor,
        "owed",
      ),
    listDue: () => listDueWorkshopEmails(db),
    send: sendWorkshopEmail,
  }).catch((error) => {
    console.error("[cron] workshop jobs failed:", error);
    return null;
  });
  return NextResponse.json({ ...result, workshops });
}
