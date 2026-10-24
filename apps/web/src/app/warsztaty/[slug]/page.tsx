import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { readSeatNotice } from "@/features/workshops/signup-paths";
import { WorkshopPageView } from "@/features/workshops/workshop-page";
import { workshopHref, workshopSeo } from "@/features/workshops/workshop-view";
import { baseOpenGraph } from "@/lib/page-metadata";
import { getBookingWindow } from "@/lib/public-data";
import {
  getWorkshop,
  getWorkshopRedirect,
  workshopImageUrl,
} from "@/lib/workshop-data";

// A workshop's page (docs/product/workshops-plan.md, PR 3 and 4): the one
// H1 with when, where, who leads, the price and the seats; the sign-up (or
// the waitlist when full, or why one cannot sign up); the cover, the
// description, who it is for and the program; the leaders; the rules
// (refunds, paying later, the minimum); the Event data for Google. A draft
// is not found; a cancelled or past one stays, labelled. The page itself is
// WorkshopPageView (the preview's too, #197).

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/warsztaty/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const workshop = await getWorkshop(slug);
  if (!workshop) return { title: "Nie znaleziono warsztatu" };
  const seo = workshopSeo(workshop);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: workshopHref(workshop.slug) },
    openGraph: {
      ...baseOpenGraph,
      title: seo.title,
      description: seo.description,
      url: workshopHref(workshop.slug),
      // The cover, or else the list's picture (an own openGraph drops it).
      images: [
        workshop.coverPath
          ? {
              url: workshopImageUrl(workshop.coverPath),
              alt: workshop.coverAlt ?? workshop.title,
            }
          : {
              url: "/warsztaty/opengraph-image",
              alt: "Warsztaty · Kolor Sensu",
            },
      ],
    },
  };
}

export default async function WorkshopPage({
  params,
  searchParams,
}: PageProps<"/warsztaty/[slug]">) {
  const { slug } = await params;
  const notice = readSeatNotice((await searchParams).zapis);
  const [workshop, window] = await Promise.all([
    getWorkshop(slug),
    getBookingWindow(),
  ]);
  if (!workshop) {
    // An address changed: the old one leads to the new (#184).
    const moved = await getWorkshopRedirect(slug);
    if (moved) permanentRedirect(workshopHref(moved));
    notFound();
  }

  // Called, not rendered as an element: one server render, as before.
  return WorkshopPageView({
    notice,
    timeZone: window?.timeZone ?? "Europe/Warsaw",
    workshop,
  });
}
