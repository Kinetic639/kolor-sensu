import { ClosingBanner } from "@repo/ui/public-site";
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
    <ClosingBanner
      heading={heading ?? words.heading}
      bookingLabel={words.bookingLabel}
      contactLabel={words.contactLabel}
    />
  );
}
