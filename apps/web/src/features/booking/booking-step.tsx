import { getBooking, type GuestBooking } from "@repo/supabase";
import { BookingStepper, BookingSummary } from "@repo/ui/booking";
import { CalendarDays, FileText, House, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";
import { readHoldToken } from "./hold-cookie";
import {
  bookingHref,
  bookingNoticeHref,
  loadBookingParams,
} from "./search-params";
import { visitLabel } from "./visit-label";

// The steps after a time is held (Dane, Płatność, Potwierdzenie): the
// visit is found by the guest's cookie, never by the address.

const STEPS = [
  "Usługa",
  "Forma",
  "Specjalista",
  "Termin",
  "Dane",
  "Potwierdzenie",
].map((label) => ({ key: label, label }));

export const EXPIRED_HREF = bookingNoticeHref(
  loadBookingParams(new URLSearchParams()),
  "rezerwacja-wygasla",
);

export interface GuestVisit {
  token: string;
  booking: GuestBooking;
  timeZone: string;
}

/** The guest's visit, or null (no cookie, a wrong one, nothing found). */
export async function readGuestVisit(): Promise<GuestVisit | null> {
  const token = await readHoldToken();
  if (!token) return null;
  const booking = await getBooking(createSecretClient(), token).catch(
    (error) => {
      console.error("[booking] reading the visit failed:", error);
      return null;
    },
  );
  if (!booking) return null;
  const timeZone = (await getBookingWindow())?.timeZone ?? "Europe/Warsaw";
  return { token, booking, timeZone };
}

/** The guest's live hold; otherwise back to the wizard. */
export async function requireLiveHold(): Promise<GuestVisit> {
  const visit = await readGuestVisit();
  if (!visit) redirect(bookingHref({}));
  const { booking } = visit;
  const live =
    booking.status === "held" &&
    booking.holdExpiresAt !== null &&
    new Date(booking.holdExpiresAt) > new Date();
  if (!live) redirect(EXPIRED_HREF);
  return visit;
}

export function BookingStep({
  current,
  title,
  lead,
  visit,
  aside,
  children,
}: {
  /** 4: Dane, 5: Potwierdzenie. */
  current: number;
  title: string;
  lead?: ReactNode;
  visit: GuestVisit;
  /** Under the summary (the hold notice). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const { booking, timeZone } = visit;
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-display text-ink">Umów spotkanie</h1>
        <BookingStepper
          className="w-full max-w-2xl"
          current={current}
          steps={STEPS}
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="booking-step-heading"
          className="rounded-card border-border/70 bg-surface shadow-card border p-5 sm:p-6"
        >
          <h2
            className="font-display text-h3 text-ink"
            id="booking-step-heading"
          >
            {title}
          </h2>
          <p className="text-small text-text-muted mt-1">
            Numer rezerwacji:{" "}
            <strong className="text-ink">{booking.reference}</strong>
          </p>
          {lead ? (
            <div className="text-body text-text-muted mt-4">{lead}</div>
          ) : null}
          <div className="mt-6">{children}</div>
        </section>
        <BookingSummary
          items={[
            {
              key: "usluga",
              icon: <FileText />,
              label: "Usługa",
              value: booking.serviceName,
              detail: formatPrice(booking),
            },
            {
              key: "forma",
              icon: <House />,
              label: "Forma",
              value:
                booking.mode === "online"
                  ? "Online"
                  : [booking.locationName, booking.roomName]
                      .filter(Boolean)
                      .join(" · ") || "Stacjonarnie",
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
              value: visitLabel(booking.startsAt, timeZone),
            },
          ]}
        >
          {aside}
        </BookingSummary>
      </div>
    </div>
  );
}
