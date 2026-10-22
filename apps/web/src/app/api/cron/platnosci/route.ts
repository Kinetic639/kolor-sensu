import { cancelUnpaidVisits, listDueBookingEmails } from "@repo/supabase";
import { runWorkshopJobs } from "@repo/supabase/workshops";
import { NextResponse } from "next/server";
import { sendVisitEmailOnce } from "@/features/booking/email/confirmation-server";
import { isCronRequest, runPaymentJobs } from "@/features/booking/payment-jobs";
import { checkStuckPayments } from "@/features/booking/payment-server";
import { createSecretClient } from "@/lib/supabase/secret";

// Called by the database every 15 minutes (pg_cron + pg_net, migration
// payment_schedule): payments stuck pending are asked of Stripe, unpaid
// reservations are cancelled and the payment and visit reminders go out
// (R11). Workshop seats whose hold, offer or payment time ran out end
// too (their seats go to the waitlist).

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
  const workshopSeats = await runWorkshopJobs(db).catch((error) => {
    console.error("[cron] workshop jobs failed:", error);
    return null;
  });
  return NextResponse.json({ ...result, workshopSeats });
}
