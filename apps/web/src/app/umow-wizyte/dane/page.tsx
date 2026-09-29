import { getBooking } from "@repo/supabase";
import { BookingStepper, BookingSummary, HoldNotice } from "@repo/ui/booking";
import { SecondaryButton } from "@repo/ui/public-site";
import { formatDate, formatWeekday } from "@repo/scheduling";
import { CalendarDays, FileText, House, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { releaseHoldAction } from "@/features/booking/actions";
import { DetailsForm } from "@/features/booking/details-form";
import { readHoldToken } from "@/features/booking/hold-cookie";
import {
  bookingHref,
  bookingNoticeHref,
  loadBookingParams,
} from "@/features/booking/search-params";
import { formatPrice } from "@/lib/format";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";

export const metadata: Metadata = {
  title: "Twoje dane · Umów wizytę",
  robots: { index: false },
};

const STEPS = [
  "Usługa",
  "Forma",
  "Specjalista",
  "Termin",
  "Dane",
  "Potwierdzenie",
].map((label) => ({ key: label, label }));

function local(
  instant: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("pl-PL", { timeZone, ...options }).format(
    new Date(instant),
  );
}

// Step 5: the held visit, found by the guest's cookie (never the address),
// and the client's details. The payment comes next (R6).
export default async function BookingDetailsPage() {
  const token = await readHoldToken();
  const booking = token
    ? await getBooking(createSecretClient(), token).catch((error) => {
        console.error("[booking] reading the held visit failed:", error);
        return null;
      })
    : null;
  if (!booking) redirect(bookingHref({}));

  const timeZone = (await getBookingWindow())?.timeZone ?? "Europe/Warsaw";
  const held =
    booking.status === "held" &&
    booking.holdExpiresAt !== null &&
    new Date(booking.holdExpiresAt) > new Date();
  if (!held) {
    redirect(
      bookingNoticeHref(
        loadBookingParams(new URLSearchParams()),
        "rezerwacja-wygasla",
      ),
    );
  }

  const date = local(booking.startsAt, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .split(".")
    .reverse()
    .join("-");
  const time = local(booking.startsAt, timeZone, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8 pt-8 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-display text-ink">Umów spotkanie</h1>
        <BookingStepper
          className="w-full max-w-2xl"
          current={4}
          steps={STEPS}
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="details-heading"
          className="rounded-card border-border/70 bg-surface shadow-card border p-5 sm:p-6"
        >
          <h2 className="font-display text-h3 text-ink" id="details-heading">
            Twoje dane
          </h2>
          <p className="text-small text-text-muted mt-1">
            Numer rezerwacji:{" "}
            <strong className="text-ink">{booking.reference}</strong>
          </p>
          <div className="mt-6">
            <DetailsForm
              saved={
                booking.details
                  ? {
                      ...booking.details,
                      notes: booking.details.notes ?? "",
                      acceptTerms: true,
                      acceptPrivacy: true,
                    }
                  : null
              }
            />
          </div>
          <form
            action={releaseHoldAction}
            className="border-border/70 mt-8 border-t pt-6"
          >
            <SecondaryButton size="sm" type="submit">
              Zmień termin
            </SecondaryButton>
          </form>
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
              value: `${formatWeekday(date)}, ${formatDate(date)}, godz. ${time}`,
            },
          ]}
        >
          <HoldNotice
            until={local(booking.holdExpiresAt!, timeZone, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        </BookingSummary>
      </div>
    </div>
  );
}
