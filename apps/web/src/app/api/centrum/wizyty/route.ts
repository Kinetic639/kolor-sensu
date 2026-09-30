import { centreBookVisit } from "@repo/supabase";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { NextResponse } from "next/server";
import { bookVisitAsCentre } from "@/features/booking/centre-booking";
import { sendVisitConfirmation } from "@/features/booking/email/confirmation-server";
import { getBookingWindow } from "@/lib/public-data";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";

// A portal books a visit (K5, "+ Nowa wizyta"). The e-mails live here, with
// the site; the signed-in user's access token comes with the request and
// the database books as them, checking they are an admin or the specialist
// themselves.

const STATUS: Record<string, number> = {
  invalid: 400,
  forbidden: 403,
  not_bookable: 422,
  room_required: 422,
  invalid_details: 422,
  in_the_past: 422,
  specialist_busy: 409,
  room_busy: 409,
  room_closed: 409,
  time_off: 409,
};

export async function POST(request: Request) {
  const token = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const asUser = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    token,
  );
  const window = await getBookingWindow();

  const result = await bookVisitAsCentre(body, {
    timeZone: window?.timeZone ?? "Europe/Warsaw",
    book: (input) => centreBookVisit(asUser, input),
    confirm: sendVisitConfirmation,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: STATUS[result.code] ?? 500 });
  }
  return NextResponse.json(result, { status: 201 });
}
