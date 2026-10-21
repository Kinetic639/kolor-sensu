import { EbookGrid } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { educationPage } from "@/content/site";
import { EBOOKS_PATH, ebookCard } from "@/features/education/ebook-view";
import { articleImageUrl, getEbooks } from "@/lib/education-data";

// Every published e-book, newest first; each one's page has the way to
// buy it on Naffy and the free sample.

export const metadata: Metadata = {
  title: "E-booki",
  description: educationPage.ebooksLead,
  alternates: { canonical: EBOOKS_PATH },
};

export default async function EbooksPage() {
  const ebooks = await getEbooks();

  return (
    <>
      <PageIntro
        eyebrow="Edukacja"
        heading="E-booki"
        lead={educationPage.ebooksLead}
      />
      <div className="max-w-page px-gutter pb-section-sm mx-auto">
        {ebooks.length ? (
          <EbookGrid
            ebooks={ebooks.map((ebook) => ({
              ...ebookCard(ebook),
              coverUrl: ebook.coverPath
                ? articleImageUrl(ebook.coverPath)
                : null,
            }))}
            headingLevel="h2"
          />
        ) : (
          <p className="text-body text-text-muted">
            {educationPage.ebooksEmpty}
          </p>
        )}
      </div>
    </>
  );
}
