import { FeatureSection, SoftCard } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { workshops, workshopsPage } from "@/content/site";
import { pageMetadata } from "@/lib/page-metadata";
import { getWatercolorLook, getClosingCta } from "@/lib/public-data";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("workshops");
}

export default async function WorkshopsPage() {
  const [watercolor, closing] = await Promise.all([
    getWatercolorLook(),
    getClosingCta(),
  ]);
  return (
    <>
      <PageIntro
        eyebrow={workshops.eyebrow}
        heading={workshopsPage.heading}
        accent={workshopsPage.accent}
        lead={workshopsPage.lead}
      />
      <section className="max-w-page px-gutter mx-auto">
        <SoftCard tone="cream" className="grid gap-3 p-6 lg:p-8">
          <h2 className="font-display text-h3 text-ink">
            Nadchodzące wydarzenia
          </h2>
          <p className="text-body text-text-muted max-w-copy">
            {workshopsPage.empty}
          </p>
        </SoftCard>
      </section>
      <FeatureSection
        {...workshops}
        heading="Grupy i warsztaty tematyczne"
        cta={{ href: "/kontakt", label: "Zapytaj o najbliższe terminy" }}
        imagePosition="left"
        animationPreset="watercolor-reveal"
        watercolor={watercolor}
      />
      <ClosingCta words={closing} />
    </>
  );
}
