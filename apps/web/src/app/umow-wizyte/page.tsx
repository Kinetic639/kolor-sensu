import type { Metadata } from "next";
import { BookingContact } from "@/features/booking/booking-contact";
import { BookingWizard } from "@/features/booking/booking-wizard";
import { turnstileKeys } from "@/features/booking/guards";
import { loadWizard } from "@/features/booking/load-wizard";
import { readIntake } from "@/features/booking/intake-cookie";
import { RememberChoices } from "@/features/booking/remember-choices";
import { memoryValue } from "@/features/booking/wizard-memory";
import { sendToIntake } from "@/features/booking/intake-gate";
import {
  intakeHref,
  loadBookingParams,
} from "@/features/booking/search-params";
import { getIntakeServiceSlugs } from "@/lib/public-data";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/page-metadata";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("booking");
}

// The booking wizard (docs/product/booking-plan.md): its step follows from
// the address. While online booking is off, booking by phone or email. A
// service that asks for the questionnaire sends the visitor to it once it
// is chosen (/umow-wizyte/test), and back here when it is done.
export default async function BookingPage({
  searchParams,
}: PageProps<"/umow-wizyte">) {
  const params = await loadBookingParams(searchParams);
  const wizard = await loadWizard(params);
  if (!wizard) return <BookingContact specjalista={params.specjalista} />;
  // A service that asks for the questionnaire: it first, then the rest.
  const [intakeSlugs, intake] = await Promise.all([
    getIntakeServiceSlugs(),
    readIntake(),
  ]);
  if (
    sendToIntake({
      serviceSlug: wizard.params.usluga,
      intakeSlugs,
      intakeFor: intake?.serviceSlug ?? null,
      stepIndex: wizard.view.stepIndex,
    })
  ) {
    redirect(intakeHref(wizard.params));
  }
  return (
    <>
      <RememberChoices value={memoryValue(wizard.params)} />
      <BookingWizard
        params={wizard.params}
        turnstileSiteKey={turnstileKeys().siteKey}
        view={wizard.view}
      />
    </>
  );
}
