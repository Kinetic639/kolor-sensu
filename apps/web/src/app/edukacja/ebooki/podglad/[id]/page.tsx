import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EbookPageView } from "@/features/education/ebook-page";
import { getEbookPreview } from "@/lib/education-data";

// An e-book's draft as its page will show it, for the admin who opened the
// preview from the portal (Draft Mode, /api/preview; #197). Anyone else
// finds nothing here; it is never indexed.

export const metadata: Metadata = {
  title: "Podgląd e-booka",
  robots: { index: false, follow: false },
};

export default async function EbookPreviewPage({
  params,
}: PageProps<"/edukacja/ebooki/podglad/[id]">) {
  const { id } = await params;
  const ebook = await getEbookPreview(id);
  if (!ebook) notFound();
  return EbookPageView({ ebook });
}
