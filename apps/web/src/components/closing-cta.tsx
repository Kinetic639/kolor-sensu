import {
  EditorialHeading,
  PrimaryButton,
  SecondaryButton,
  WatercolorSectionBackground,
} from "@repo/ui/public-site";
import Link from "next/link";
import { bookingCta, closingCta } from "@/content/site";

// The painted band that closes a page: one line and the two actions. Inside
// a PageMotion (the homepage) the band paints itself in, then the words
// follow; elsewhere both data-motion marks do nothing.

export function ClosingCta({ heading = closingCta }: { heading?: string }) {
  return (
    <WatercolorSectionBackground
      accent
      data-motion="band"
      className="my-section-sm py-16"
    >
      <div
        data-motion="text"
        data-motion-delay="0.6"
        className="max-w-page px-gutter mx-auto flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:pr-56"
      >
        <EditorialHeading size="h3" className="lg:text-h2 max-w-xl">
          {heading}
        </EditorialHeading>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton asChild arrow>
            <Link href="/umow-wizyte">{bookingCta.label}</Link>
          </PrimaryButton>
          <SecondaryButton asChild>
            <Link href="/kontakt">Skontaktuj się</Link>
          </SecondaryButton>
        </div>
      </div>
    </WatercolorSectionBackground>
  );
}
