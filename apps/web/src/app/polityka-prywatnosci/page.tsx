import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalPages } from "@/content/site";

const page = legalPages["polityka-prywatnosci"];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/polityka-prywatnosci" },
};

export default function PrivacyPage() {
  return <LegalPage title={page.title} />;
}
