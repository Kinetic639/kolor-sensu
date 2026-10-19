import {
  EditorialHeading,
  PrimaryButton,
  SecondaryButton,
  WatercolorSectionBackground,
} from "@repo/ui/public-site";
import Link from "next/link";
import { defaultClosingCta, type ClosingCtaContent } from "@repo/contracts";

// The painted band that closes a page: one line and the two actions. Its
// words are the CMS's (Ustawienia wspólne → "Baner na końcu strony", read
// by the page with getClosingCta); a page may give its own line
// (Specjaliści: "Nie wiesz, do kogo się zapisać?").

export function ClosingCta({
  words = defaultClosingCta,
  heading,
}: {
  words?: ClosingCtaContent;
  heading?: string;
}) {
  return (
    <WatercolorSectionBackground accent className="my-section-sm py-16">
      <div className="max-w-page px-gutter mx-auto flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:pr-56">
        <EditorialHeading size="h3" className="lg:text-h2 max-w-xl">
          {heading ?? words.heading}
        </EditorialHeading>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton asChild arrow>
            <Link href="/umow-wizyte">{words.bookingLabel}</Link>
          </PrimaryButton>
          <SecondaryButton asChild>
            <Link href="/kontakt">{words.contactLabel}</Link>
          </SecondaryButton>
        </div>
      </div>
    </WatercolorSectionBackground>
  );
}
