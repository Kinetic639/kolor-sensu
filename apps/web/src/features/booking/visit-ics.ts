import type { GuestBooking } from "@repo/supabase";
import { visitIcs } from "./email/ics";

// A confirmed visit as a calendar file to download: from the e-mail link's
// page, and from the confirmation page after paying (Klient · 4, card 6).

export function visitIcsResponse(booking: GuestBooking, url: string | null) {
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
    url,
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
