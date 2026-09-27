import { FeatureSection, SoftCard } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { workshops, workshopsPage } from "@/content/site";

export const metadata: Metadata = {
  title: "Warsztaty",
  description:
    "Warsztaty, grupy rozwojowe i spotkania tematyczne w Kolor Sensu.",
  alternates: { canonical: "/warsztaty" },
};

export default function WorkshopsPage() {
  return (
    <>
      <PageIntro
        trail={[{ label: "Warsztaty" }]}
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
      />
      <ClosingCta />
    </>
  );
}
