import { IntakeQuestionnaire } from "@repo/ui/booking";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveIntakeAction } from "@/features/booking/intake-actions";
import {
  bookingHref,
  changeBookingHref,
  loadBookingParams,
} from "@/features/booking/search-params";
import { getBookableCatalog, getIntakeServiceSlugs } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Test przed konsultacją",
  robots: { index: false },
};

// The questionnaire before a first consultation, between choosing the
// service and the rest of the wizard: given, it goes back to the wizard
// with the choices made so far. A service that does not ask for it goes
// straight back.
export default async function IntakePage({
  searchParams,
}: PageProps<"/umow-wizyte/test">) {
  const params = await loadBookingParams(searchParams);
  const [catalog, intakeSlugs] = await Promise.all([
    getBookableCatalog(),
    getIntakeServiceSlugs(),
  ]);
  const service = catalog.services.find((one) => one.slug === params.usluga);
  if (!service || !intakeSlugs.has(service.slug)) {
    redirect(bookingHref(params));
  }
  // The wizard's choices so far, to come back to.
  const query = bookingHref(params).split("?")[1] ?? "";

  return (
    <div className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 pt-8 lg:pt-12">
      <div className="grid gap-2">
        <h1 className="font-display text-display text-ink">
          Test przed konsultacją
        </h1>
        <p className="text-small text-text-muted">
          {service.name} ·{" "}
          <Link
            className="text-primary-strong font-semibold underline underline-offset-4"
            href={changeBookingHref(params, "usluga")}
          >
            Zmień usługę
          </Link>
        </p>
      </div>
      <div className="max-w-3xl">
        <IntakeQuestionnaire onSubmit={saveIntakeAction.bind(null, query)} />
      </div>
    </div>
  );
}
