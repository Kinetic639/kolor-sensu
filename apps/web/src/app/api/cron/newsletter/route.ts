import { NextResponse } from "next/server";
import { isCronRequest } from "@/features/booking/payment-jobs";
import { syncNewsletterNow } from "@/features/newsletter/server";

// Called by the database every 10 minutes (pg_cron + pg_net, migration
// newsletter): copies confirmed addresses to Resend and deletes there the
// ones being removed (an admin's removal, a client's data removed, an
// unconfirmed sign-up past 7 days), retrying whatever failed before.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequest(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncNewsletterNow());
}
