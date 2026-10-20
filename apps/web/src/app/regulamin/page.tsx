import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/page-metadata";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("terms");
}

export default function TermsPage() {
  return <LegalPage page="legal_terms" />;
}
