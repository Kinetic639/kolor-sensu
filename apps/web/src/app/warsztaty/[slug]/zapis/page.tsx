import { SecondaryButton } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { releaseSeatAction } from "@/features/workshops/actions";
import { deadlineLabel } from "@/features/booking/visit-label";
import { newsletterController } from "@/features/newsletter/signup-server";
import {
  SeatCodeForm,
  SeatDetailsForm,
} from "@/features/workshops/signup-forms";
import { requireHeldSeat, SeatStep } from "@/features/workshops/seat-step";
import { getNewsletterBand } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Zapis na warsztat",
  robots: { index: false },
};

// The sign-up's details step: the participant's details and consents, the
// discount code, then pay now, pay later (more than a week ahead) or, when
// nothing is to be paid, confirm. Only for the seat this browser holds.
export default async function SeatDetailsPage({
  params,
}: PageProps<"/warsztaty/[slug]/zapis">) {
  const { slug } = await params;
  const [seat, newsletter] = await Promise.all([
    requireHeldSeat(slug),
    getNewsletterBand(),
  ]);
  const { registration, timeZone } = seat;
  const free = registration.priceMinor === 0;
  const payLater =
    registration.canPayLater && registration.status === "held"
      ? deadlineLabel(registration.fullRefundUntil, timeZone)
      : null;

  return (
    <SeatStep
      lead="Podaj swoje dane: wyślemy na nie potwierdzenie zapisu i wszystko, co trzeba wiedzieć przed warsztatem."
      seat={seat}
      title="Twoje dane"
    >
      {registration.discount || registration.priceMinor > 0 ? (
        <SeatCodeForm
          applied={
            registration.discount
              ? {
                  code: registration.discount.code,
                  discountMinor: registration.discount.discountMinor,
                }
              : null
          }
          slug={slug}
        />
      ) : null}
      <SeatDetailsForm
        free={free}
        newsletterController={
          newsletter.visible ? await newsletterController() : null
        }
        payLater={payLater}
        saved={
          registration.details
            ? {
                ...registration.details,
                notes: registration.details.notes ?? "",
                acceptTerms: true,
                acceptPrivacy: true,
              }
            : null
        }
        slug={slug}
      />
      <form
        action={releaseSeatAction}
        className="border-border/70 border-t pt-6"
      >
        <input name="slug" type="hidden" value={slug} />
        <SecondaryButton size="sm" type="submit">
          Rezygnuję z zapisu
        </SecondaryButton>
      </form>
    </SeatStep>
  );
}
