import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkshopPageView } from "@/features/workshops/workshop-page";
import { getBookingWindow } from "@/lib/public-data";
import { getWorkshopPreviewDraft } from "@/lib/workshop-data";

// A draft workshop as its page will show it, for the admin who opened the
// preview from the portal (Draft Mode, /api/preview; #197). No sign-up
// here. Anyone else finds nothing; it is never indexed.

export const metadata: Metadata = {
  title: "Podgląd warsztatu",
  robots: { index: false, follow: false },
};

export default async function WorkshopPreviewPage({
  params,
}: PageProps<"/warsztaty/podglad/[id]">) {
  const { id } = await params;
  const [workshop, window] = await Promise.all([
    getWorkshopPreviewDraft(id),
    getBookingWindow(),
  ]);
  if (!workshop) notFound();
  return (
    <WorkshopPageView
      preview
      timeZone={window?.timeZone ?? "Europe/Warsaw"}
      workshop={workshop}
    />
  );
}
