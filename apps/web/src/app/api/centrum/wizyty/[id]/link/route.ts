import { centreResendVisitLink } from "@repo/supabase";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { NextResponse } from "next/server";
import { resendVisitLink } from "@/features/booking/centre-booking";
import { sendVisitEmailOnce } from "@/features/booking/email/confirmation-server";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";

// A portal sends a visit's link again (R11; Klient · 6, card 7): a
// reservation's link to pay, or a confirmed visit's confirmation. The e-mails live
// here, with the site; the signed-in user's access token comes with the
// request and the database checks they are an admin or the specialist.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS: Record<string, number> = {
  not_found: 404,
  forbidden: 403,
  not_payable: 409,
  nothing_to_send: 409,
  recently_sent: 429,
};

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/centrum/wizyty/[id]/link">,
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
  const asUser = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    token,
  );
  const result = await resendVisitLink(id, {
    allow: (appointmentId) => centreResendVisitLink(asUser, appointmentId),
    send: (reference, kind) => sendVisitEmailOnce(reference, kind),
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code },
      { status: STATUS[result.code] ?? 500 },
    );
  }
  return NextResponse.json(result);
}
