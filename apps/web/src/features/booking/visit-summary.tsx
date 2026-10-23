import type { GuestBooking } from "@repo/supabase";
import type { BookingSummaryItem } from "@repo/ui/booking";
import { CalendarDays, FileText, House, UserRound } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { localTime, ONLINE_LINK_NOTE, visitLabel } from "./visit-label";

/** A booked visit's summary rows (the visit's pages). */
export function visitSummaryItems(
  booking: GuestBooking,
  timeZone: string,
): BookingSummaryItem[] {
  return [
    {
      key: "usluga",
      icon: <FileText />,
      label: "Usługa",
      value: booking.serviceName,
      detail: formatPrice(booking),
    },
    {
      key: "specjalista",
      icon: <UserRound />,
      label: "Specjalista",
      value: booking.specialistName ?? undefined,
    },
    {
      key: "termin",
      icon: <CalendarDays />,
      label: "Termin",
      value: `${visitLabel(booking.startsAt, timeZone)}–${localTime(booking.endsAt, timeZone)}`,
    },
    {
      key: "forma",
      icon: <House />,
      label: "Miejsce",
      value:
        booking.mode === "online"
          ? "Online"
          : [booking.locationName, booking.roomName]
              .filter(Boolean)
              .join(" · ") || "Stacjonarnie",
      detail: booking.mode === "online" ? ONLINE_LINK_NOTE : undefined,
    },
  ];
}
