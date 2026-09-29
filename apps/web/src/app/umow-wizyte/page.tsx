import type { Metadata } from "next";
import { BookingContact } from "@/features/booking/booking-contact";
import { BookingWizard } from "@/features/booking/booking-wizard";
import { loadWizard } from "@/features/booking/load-wizard";
import { loadBookingParams } from "@/features/booking/search-params";

export const metadata: Metadata = {
  title: "Umów wizytę",
  description:
    "Umów wizytę w Kolor Sensu: wybierz usługę, formę spotkania, specjalistę i wolny termin.",
  alternates: { canonical: "/umow-wizyte" },
};

// The booking wizard (docs/product/booking-plan.md): its step follows from
// the address. While online booking is off, booking by phone or email.
export default async function BookingPage({
  searchParams,
}: PageProps<"/umow-wizyte">) {
  const params = await loadBookingParams(searchParams);
  const wizard = await loadWizard(params);
  if (!wizard) return <BookingContact specjalista={params.specjalista} />;
  return <BookingWizard params={wizard.params} view={wizard.view} />;
}
