import { visitsToCloseBySpecialist } from "@repo/supabase/visit-closing";
import { NextResponse } from "next/server";
import { isCronRequest } from "@/features/booking/payment-jobs";
import { closingEmail } from "@/features/closing/closing-email";
import { emailSender, sendEmail } from "@/lib/email";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";

// Called by the database every morning (pg_cron + pg_net, migration
// visit_closures): each specialist with visits to close gets one e-mail
// with them and the link to close them (once a day: the key says so).

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequest(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [reminders, window] = await Promise.all([
    visitsToCloseBySpecialist(createSecretClient()),
    getBookingWindow(),
  ]);
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const portalUrl = process.env.SPECIALIST_URL || "http://localhost:3002";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  let sent = 0;
  let failed = 0;
  for (const reminder of reminders) {
    try {
      await sendEmail(
        {
          from: emailSender(),
          to: reminder.email,
          ...closingEmail(reminder, { portalUrl, timeZone }),
        },
        `closing:${reminder.specialistId}:${day}`,
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("[closing] the reminder e-mail failed:", error);
    }
  }
  return NextResponse.json({ specialists: reminders.length, sent, failed });
}
