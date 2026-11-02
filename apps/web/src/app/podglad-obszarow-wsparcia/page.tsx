import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bookingCta, defaultSupportAreas } from "@/content/site";
import { getHomeHeaders, getSupportAreas } from "@/lib/public-data";
import { toSupportAreaItems } from "@/lib/support-areas";
import { SectionPreview } from "./section-preview";

export const metadata: Metadata = {
  title: "Obszary wsparcia — podgląd sekcji",
  robots: { index: false, follow: false },
};

export default async function SupportAreasPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const [headers, areas] = await Promise.all([
    getHomeHeaders(),
    getSupportAreas(),
  ]);
  return (
    <SectionPreview
      content={{
        header: headers.supportAreas,
        areas: toSupportAreaItems(areas, defaultSupportAreas, bookingCta),
        cta: { href: "/oferta", label: "Zobacz całą ofertę" },
      }}
    />
  );
}
