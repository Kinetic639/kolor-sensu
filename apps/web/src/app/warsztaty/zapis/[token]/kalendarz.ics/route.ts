import { getWorkshopRegistration } from "@repo/supabase/workshops";
import { visitIcs } from "@/features/booking/email/ics";
import { siteUrl } from "@/features/booking/email/confirmation-server";
import { createSecretClient } from "@/lib/supabase/secret";

// A confirmed workshop seat as a calendar file, from its registration's
// page ("Dodaj do kalendarza", #198): the same event as the confirmation
// e-mail's (its uid), a moved date as its update.

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/warsztaty/zapis/[token]/kalendarz.ics">,
) {
  const { token } = await params;
  const registration = await getWorkshopRegistration(
    createSecretClient(),
    token,
  ).catch(() => null);
  if (
    !registration ||
    registration.status !== "confirmed" ||
    registration.workshopStatus !== "published"
  ) {
    return new Response("Not found", { status: 404 });
  }
  const manageUrl = `${siteUrl()}/warsztaty/zapis/${token}`;
  const place =
    registration.modality === "online"
      ? registration.meetingUrl
        ? `Online: ${registration.meetingUrl}`
        : "Online"
      : [
          registration.locationName,
          registration.locationAddress,
          registration.roomName,
        ]
          .filter(Boolean)
          .join(", ");
  const body = visitIcs({
    uid: `${registration.reference}@kolorsensu.pl`,
    startsAt: registration.startsAt,
    endsAt: registration.endsAt,
    summary: `${registration.workshopTitle} – warsztat w Kolor Sensu`,
    location: place,
    description: [
      `Numer zapisu: ${registration.reference}`,
      `Szczegóły: ${manageUrl}`,
    ].join("\n"),
    url: manageUrl,
    // After a new date the e-mail sent the event's update; this one too.
    sequence: registration.refundAnyTime ? 1 : 0,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="warsztat-${registration.reference}.ics"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
