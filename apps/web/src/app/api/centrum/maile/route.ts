import { getCenterSettings } from "@repo/supabase";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { NextResponse } from "next/server";
import { emailPreviews } from "@/features/booking/email/catalogue";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { newsletterEmailPreviews } from "@/features/newsletter/preview";
import { getSiteFrame } from "@/lib/site-frame";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";
import { createSecretClient } from "@/lib/supabase/secret";

// Every e-mail a client gets, for the admin's portal (CMS → E-maile), and
// the newsletter's confirmation link: each
// built by the same functions and template as the real ones, from a sample
// visit, with the centre's contact, company and reminder settings. The
// admin's token comes with the request; the database says whether they
// are one.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const asUser = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    token,
  );
  const { data: isAdmin } = await asUser.rpc("has_role", {
    required_role: "admin",
  });
  if (isAdmin !== true) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [{ contact, company }, settings] = await Promise.all([
    getSiteFrame(),
    getCenterSettings(createSecretClient()),
  ]);
  const [previews, newsletter] = await Promise.all([
    emailPreviews(
      {
        siteUrl: siteUrl(),
        timeZone: settings.timezone,
        contact: { phone: contact?.phoneLabel, email: contact?.email },
        visitReminderHours: settings.visitReminderHours,
        paymentReminderHours: settings.paymentReminderHours,
      },
      company,
    ),
    newsletterEmailPreviews(siteUrl(), company),
  ]);
  return NextResponse.json({ emails: [...previews, ...newsletter] });
}
