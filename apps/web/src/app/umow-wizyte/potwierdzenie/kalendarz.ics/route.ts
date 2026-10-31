import { readGuestVisit } from "@/features/booking/booking-step";
import { visitIcsResponse } from "@/features/booking/visit-ics";

// The visit just confirmed as a calendar file, from the confirmation page
// (Klient · 4, card 6): found by the guest's cookie, never by the address.

export const dynamic = "force-dynamic";

export async function GET() {
  const visit = await readGuestVisit();
  if (!visit || visit.booking.status !== "confirmed") {
    return new Response("Not found", { status: 404 });
  }
  return visitIcsResponse(visit.booking, null);
}
