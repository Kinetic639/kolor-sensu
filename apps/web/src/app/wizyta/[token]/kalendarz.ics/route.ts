import { siteUrl } from "@/features/booking/email/confirmation-server";
import { visitByLinkToken } from "@/features/booking/guest-visit";
import { visitIcsResponse } from "@/features/booking/visit-ics";

// The confirmed visit as a calendar file, from the e-mail link's page.

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/wizyta/[token]/kalendarz.ics">,
) {
  const { token } = await params;
  const visit = await visitByLinkToken(token);
  if (!visit || visit.booking.status !== "confirmed") {
    return new Response("Not found", { status: 404 });
  }
  return visitIcsResponse(visit.booking, `${siteUrl()}/wizyta/${token}`);
}
