import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalPages } from "@/content/site";

const page = legalPages["regulamin"];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/regulamin" },
};

export default function TermsPage() {
  return <LegalPage title={page.title} />;
}
