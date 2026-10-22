import { cancelUnpaidVisits, listDueBookingEmails } from "@repo/supabase";
import { NextResponse } from "next/server";
import { sendVisitEmailOnce } from "@/features/booking/email/confirmation-server";
import { isCronRequest, runPaymentJobs } from "@/features/booking/payment-jobs";
import { checkStuckPayments } from "@/features/booking/payment-server";
import { createSecretClient } from "@/lib/supabase/secret";

// Called by the database every 15 minutes (pg_cron + pg_net, migration
// payment_schedule): payments stuck pending are asked of Stripe, unpaid
// reservations are cancelled and the payment and visit reminders go out
// (R11).

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
  return NextResponse.json(result);
}
