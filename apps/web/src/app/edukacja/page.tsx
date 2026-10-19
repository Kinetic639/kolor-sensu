import { SoftCard } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { getClosingCta } from "@/lib/public-data";
import { PageIntro } from "@/components/page-intro";
import { educationPage } from "@/content/site";
import { pageMetadata } from "@/lib/page-metadata";

// Edukacja: the place for what the centre teaches (articles first, other
// kinds later, each under its own path, e.g. /edukacja/artykuly/[slug]).
// For now its introduction and a word that the content is coming.

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("education");
}

export default async function EducationPage() {
  const closing = await getClosingCta();
  return (
    <>
      <PageIntro
        eyebrow={educationPage.eyebrow}
        heading={educationPage.heading}
        accent={educationPage.accent}
        lead={educationPage.lead}
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        <SoftCard tone="cream" className="grid gap-3 p-6 lg:p-8">
          <h2 className="font-display text-h3 text-ink">
            {educationPage.soonHeading}
          </h2>
          <p className="text-body text-text-muted max-w-copy">
            {educationPage.soon}
          </p>
        </SoftCard>
      </section>
      <ClosingCta words={closing} />
    </>
  );
}
