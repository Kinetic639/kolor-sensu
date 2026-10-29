import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { BookingRulesSection } from "@/features/booking/booking-rules-section";
import { pageMetadata } from "@/lib/page-metadata";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("terms");
}

export default function TermsPage() {
  return <LegalPage after={<BookingRulesSection />} page="legal_terms" />;
}
