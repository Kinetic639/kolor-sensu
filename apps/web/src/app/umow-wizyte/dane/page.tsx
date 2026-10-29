import { getBooking } from "@repo/supabase";
import { HoldNotice } from "@repo/ui/booking";
import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { releaseHoldAction } from "@/features/booking/actions";
import { BookingStep, requireLiveHold } from "@/features/booking/booking-step";
import { DetailsForm } from "@/features/booking/details-form";
import { DiscountForm } from "@/features/booking/discount-form";
import { ResumeBooking } from "@/features/booking/remember-choices";
import { StartOverForm } from "@/features/booking/start-over-form";
import { readFormerHoldToken } from "@/features/booking/hold-cookie";
import { payLaterUntil } from "@/features/booking/pay-later";
import { deadlineLabel, localTime } from "@/features/booking/visit-label";
import { newsletterController } from "@/features/newsletter/signup-server";
import { getBookingWindow, getNewsletterBand } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";

export const metadata: Metadata = {
  title: "Twoje dane · Umów wizytę",
  robots: { index: false },
};

// Step 5: the client's details for their held visit, with a discount
// code; saving them goes on to the payment, reserves the visit to pay
// later (R11), or, when the code covers it all, confirms it. The newsletter
// is offered while the CMS shows it. After "Zmień termin", the details
// given for the time given back are filled in again (#164).
export default async function BookingDetailsPage() {
  const visit = await requireLiveHold();
  const { booking, timeZone, discount } = visit;
  const [window, newsletter, former] = await Promise.all([
    getBookingWindow(),
    getNewsletterBand(),
    booking.details ? null : formerDetails(),
  ]);
  const until = payLaterUntil(booking.startsAt, window?.paymentDueHours);

  return (
    <BookingStep
      aside={<HoldNotice until={localTime(booking.holdExpiresAt!, timeZone)} />}
      current={4}
      title="Twoje dane"
      visit={visit}
    >
      <div className="border-border/70 mb-6 border-b pb-6">
        <DiscountForm applied={discount} />
      </div>
      <DetailsForm
        free={booking.priceMinor === 0}
        newsletterController={
          newsletter.visible ? await newsletterController() : null
        }
        payLater={until ? deadlineLabel(until, timeZone) : null}
        prefill={former ? { ...former, notes: former.notes ?? "" } : null}
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
      <div className="border-border/70 mt-8 flex flex-wrap gap-3 border-t pt-6">
        <form action={releaseHoldAction}>
          <SecondaryButton size="sm" type="submit">
            Zmień termin
          </SecondaryButton>
        </form>
        <StartOverForm />
      </div>
      <ResumeBooking href="/umow-wizyte/dane" />
    </BookingStep>
  );
}

/** The details given for the time the visitor gave back, if any. */
async function formerDetails() {
  const token = await readFormerHoldToken();
  if (!token) return null;
  const former = await getBooking(createSecretClient(), token).catch(
    () => null,
  );
  return former?.details ?? null;
}
