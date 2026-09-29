import { HoldNotice } from "@repo/ui/booking";
import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { releaseHoldAction } from "@/features/booking/actions";
import { BookingStep, requireLiveHold } from "@/features/booking/booking-step";
import { DetailsForm } from "@/features/booking/details-form";
import { localTime } from "@/features/booking/visit-label";

export const metadata: Metadata = {
  title: "Twoje dane · Umów wizytę",
  robots: { index: false },
};

// Step 5: the client's details for their held visit; saving them goes on
// to the payment.
export default async function BookingDetailsPage() {
  const visit = await requireLiveHold();
  const { booking, timeZone } = visit;

  return (
    <BookingStep
      aside={<HoldNotice until={localTime(booking.holdExpiresAt!, timeZone)} />}
      current={4}
      title="Twoje dane"
      visit={visit}
    >
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
