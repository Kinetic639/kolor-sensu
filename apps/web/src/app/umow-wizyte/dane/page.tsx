import { HoldNotice } from "@repo/ui/booking";
import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { releaseHoldAction } from "@/features/booking/actions";
import { BookingStep, requireLiveHold } from "@/features/booking/booking-step";
import { DetailsForm } from "@/features/booking/details-form";
import { DiscountForm } from "@/features/booking/discount-form";
import { payLaterUntil } from "@/features/booking/pay-later";
import { deadlineLabel, localTime } from "@/features/booking/visit-label";
import { newsletterController } from "@/features/newsletter/signup-server";
import { getBookingWindow, getNewsletterBand } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Twoje dane · Umów wizytę",
  robots: { index: false },
};

// Step 5: the client's details for their held visit, with a discount
// code; saving them goes on to the payment, reserves the visit to pay
// later (R11), or, when the code covers it all, confirms it. The newsletter
// is offered while the CMS shows it.
export default async function BookingDetailsPage() {
  const visit = await requireLiveHold();
  const { booking, timeZone, discount } = visit;
  const [window, newsletter] = await Promise.all([
    getBookingWindow(),
    getNewsletterBand(),
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
      <form
        action={releaseHoldAction}
        className="border-border/70 mt-8 border-t pt-6"
      >
        <SecondaryButton size="sm" type="submit">
          Zmień termin
        </SecondaryButton>
      </form>
    </BookingStep>
  );
}
