import {
  EditorialHeading,
  PrimaryButton,
  SecondaryButton,
  WatercolorSectionBackground,
} from "@repo/ui/public-site";
import Link from "next/link";
import { bookingCta, closingCta } from "@/content/site";

// The painted band that closes a page: one line and the two actions.

export function ClosingCta({ heading = closingCta }: { heading?: string }) {
  return (
    <WatercolorSectionBackground accent className="my-section-sm py-16">
      <div className="max-w-page px-gutter mx-auto flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:pr-56">
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
