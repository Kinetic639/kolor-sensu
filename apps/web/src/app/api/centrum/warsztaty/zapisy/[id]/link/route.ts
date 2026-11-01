import { createSupabasePublicClient } from "@repo/supabase/public";
import { centreResendWorkshopLink } from "@repo/supabase/workshops-admin";
import { NextResponse } from "next/server";
import { refusalStatus } from "@/features/workshops/centre-status";
import { resendWorkshopLink } from "@/features/workshops/centre-link";
import { sendWorkshopEmail } from "@/features/workshops/email/send";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";

// The admin portal sends a participant's link again (Warsztat · 6, card
// 8). The e-mails live here, with the site; the signed-in user's access
// token comes with the request and the database checks they are an admin.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/warsztaty/zapisy/[id]/link">,
) {
  const { id } = await params;
  const token = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const asAdmin = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    token,
  );
  const result = await resendWorkshopLink(id, {
    allow: (registrationId) =>
      centreResendWorkshopLink(asAdmin, registrationId),
    send: sendWorkshopEmail,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code },
      { status: refusalStatus(result.code) },
    );
  }
  return NextResponse.json(result);
}
