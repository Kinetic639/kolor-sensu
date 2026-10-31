import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getBookableCatalog,
  getBookingWindow,
  getLocations,
  getSpecialists,
} from "@/lib/public-data";
import { formatPrice } from "@/lib/format";
import { centreToday } from "@/features/booking/load-wizard";
import { CalendarLab } from "./calendar-lab";

export const metadata: Metadata = {
  title: "Pracownia kalendarzy — Kolor Sensu",
  robots: { index: false, follow: false },
};

export default async function CalendarPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const [catalog, window, locations, specialists] = await Promise.all([
    getBookableCatalog(),
    getBookingWindow(),
    getLocations(),
    getSpecialists(),
  ]);
  if (!window) return <p>Rezerwacje są obecnie wyłączone.</p>;
  return (
    <CalendarLab
      today={centreToday(window.timeZone)}
      horizonDays={window.horizonDays}
      timeZone={window.timeZone}
      specialists={specialists.map((one) => ({
        slug: one.publicSlug,
        name: one.displayName,
      }))}
      locations={locations.map((one) => ({ slug: one.slug, name: one.name }))}
      services={catalog.services.map((one) => ({
        slug: one.slug,
        name: one.name,
      }))}
      offers={catalog.offers.map((one) => ({
        specialist: one.specialistPublicSlug,
        service: one.serviceSlug,
        detail: `${one.effectiveDurationMinutes} min · ${formatPrice(one)}`,
        inPerson: one.supportsInPerson,
        online: one.supportsOnline,
      }))}
    />
  );
}
