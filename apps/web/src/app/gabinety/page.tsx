import { FeatureSection, SoftCard } from "@repo/ui/public-site";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { rooms, roomsPage } from "@/content/site";
import { getLocations } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Gabinety",
  description:
    "Jasne, ciche i przytulne gabinety Kolor Sensu, stworzone z myślą o komforcie i poczuciu bezpieczeństwa.",
  alternates: { canonical: "/gabinety" },
};

export default async function RoomsPage() {
  const locations = await getLocations();

  return (
    <>
      <PageIntro
        trail={[{ label: "Gabinety" }]}
        eyebrow={rooms.eyebrow}
        heading={roomsPage.heading}
        accent={roomsPage.accent}
        lead={roomsPage.lead}
      />
      <FeatureSection
        {...rooms}
        eyebrow="Na miejscu"
        imagePosition="right"
        animationPreset="watercolor-reveal"
        className="pt-0"
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        <SoftCard className="grid gap-4 p-6 lg:p-8">
          <h2 className="font-display text-h3 text-ink">Co u nas znajdziesz</h2>
          <ul className="text-body grid gap-2.5 sm:grid-cols-2">
            {roomsPage.points.map((point) => (
              <li key={point} className="flex gap-3">
                <Check
                  className="text-primary mt-1 size-4 shrink-0"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        </SoftCard>
      </section>
      {locations.length > 0 ? (
        <section className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 md:grid-cols-2">
          {locations.map((location) => (
            <SoftCard key={location.id} className="grid gap-2 p-6">
              <h2 className="font-display text-h3 text-ink">{location.name}</h2>
              <p className="text-body text-text-muted">
                {[location.addressLine1, location.addressLine2]
                  .filter(Boolean)
                  .join(", ")}
                <br />
                {[location.postalCode, location.city].filter(Boolean).join(" ")}
              </p>
            </SoftCard>
          ))}
        </section>
      ) : null}
      <ClosingCta />
    </>
  );
}
