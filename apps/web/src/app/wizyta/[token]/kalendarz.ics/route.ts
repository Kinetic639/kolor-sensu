import { visitIcs } from "@/features/booking/email/ics";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { visitByLinkToken } from "@/features/booking/guest-visit";

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
  const { booking } = visit;
  const place =
    booking.mode === "online"
      ? "Online"
      : [booking.locationName, booking.roomName].filter(Boolean).join(", ");
  const body = visitIcs({
    uid: `${booking.reference}@kolorsensu.pl`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    summary: `${booking.serviceName} – Kolor Sensu`,
    location: place,
    description: [
      `Numer rezerwacji: ${booking.reference}`,
      booking.specialistName ? `Specjalista: ${booking.specialistName}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    url: `${siteUrl()}/wizyta/${token}`,
    sequence: booking.rescheduleCount,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="wizyta-${booking.reference}.ics"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
