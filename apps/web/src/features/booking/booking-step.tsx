import { getBooking, type GuestBooking } from "@repo/supabase";
import {
  getBookingDiscount,
  type BookingDiscount,
} from "@repo/supabase/discount-codes";
import { BookingStepper, BookingSummary } from "@repo/ui/booking";
import { CalendarDays, FileText, House, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { toFreeSlots } from "@repo/scheduling";
import type { ReactNode } from "react";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";
import { priceWithDiscount } from "./discount";
import { readHoldToken } from "./hold-cookie";
import {
  bookingHref,
  bookingNoticeHref,
  loadBookingParams,
  changeBookingHref,
  type BookingParams,
} from "./search-params";
import { readMemory, MEMORY_COOKIE } from "./wizard-memory";
import { monday } from "@repo/ui/public-site/availability-calendar-dates";
import { ONLINE_LINK_NOTE, visitLabel } from "./visit-label";

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
  /** Its discount code, if one is applied. */
  discount: BookingDiscount | null;
  /** Only live holds may go back to editing; confirmed visits have their own flow. */
  editParams?: BookingParams;
}

/** The guest's visit, or null (no cookie, a wrong one, nothing found). */
export async function readGuestVisit(): Promise<GuestVisit | null> {
  const token = await readHoldToken();
  if (!token) return null;
  const db = createSecretClient();
  const booking = await getBooking(db, token).catch((error) => {
    console.error("[booking] reading the visit failed:", error);
    return null;
  });
  if (!booking) return null;
  const [window, discount] = await Promise.all([
    getBookingWindow(),
    getBookingDiscount(db, token).catch((error) => {
      console.error("[booking] reading the discount failed:", error);
      return null;
    }),
  ]);
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  let editParams: BookingParams | undefined;
  if (
    booking.status === "held" &&
    booking.holdExpiresAt &&
    new Date(booking.holdExpiresAt) > new Date()
  ) {
    const remembered = readMemory((await cookies()).get(MEMORY_COOKIE)?.value);
    const local = toFreeSlots(
      [{ starts_at: booking.startsAt, ends_at: booking.endsAt }],
      timeZone,
    )[0]!;
    editParams = {
      ...loadBookingParams(new URLSearchParams()),
      ...remembered,
      forma: booking.mode === "online" ? "online" : "stacjonarnie",
      termin: `${local.date}T${local.localTime}`,
      dalej: "auto",
      tydzien: monday(local.date),
    };
  }
  return { token, booking, timeZone, discount, editParams };
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
  const { booking, timeZone, discount, editParams } = visit;
  const keys = ["usluga", "forma", "specjalista", "termin"] as const;
  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-display text-ink">Umów spotkanie</h1>
        <BookingStepper
          className="w-full max-w-2xl"
          current={current}
          steps={STEPS.map((step, index) => ({
            ...step,
            href:
              editParams && keys[index]
                ? changeBookingHref(editParams, keys[index]!)
                : editParams && index === 4
                  ? "/umow-wizyte/dane"
                  : undefined,
          }))}
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
              detail: priceWithDiscount(booking.priceMinor, discount),
              changeHref: editParams
                ? changeBookingHref(editParams, "usluga")
                : undefined,
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
              detail: booking.mode === "online" ? ONLINE_LINK_NOTE : undefined,
              changeHref: editParams
                ? changeBookingHref(editParams, "forma")
                : undefined,
            },
            {
              key: "specjalista",
              icon: <UserRound />,
              label: "Specjalista",
              value: booking.specialistName ?? undefined,
              changeHref: editParams
                ? changeBookingHref(editParams, "specjalista")
                : undefined,
            },
            {
              key: "termin",
              icon: <CalendarDays />,
              label: "Termin",
              value: visitLabel(booking.startsAt, timeZone),
              changeHref: editParams
                ? changeBookingHref(editParams, "termin")
                : undefined,
            },
          ]}
        >
          {aside}
        </BookingSummary>
      </div>
    </div>
  );
}
