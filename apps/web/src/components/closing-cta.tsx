import {
  ArrowLink,
  EditorialHeading,
  PrimaryButton,
} from "@repo/ui/public-site";
import Image from "next/image";
import Link from "next/link";
import { defaultClosingCta, type ClosingCtaContent } from "@repo/contracts";

// The painted band that closes a page, edge to edge: a room (armchair and
// plants) on the left whose plants rise above the band, the line and the
// two actions on the right. Its words are the CMS's (Ustawienia wspólne →
// "Baner na końcu strony", read by the page with getClosingCta); a page may
// give its own line (Specjaliści: "Nie wiesz, do kogo się zapisać?").
// Styles: .ks-closing in public-site.css.

export function ClosingCta({
  words = defaultClosingCta,
  heading,
}: {
  words?: ClosingCtaContent;
  heading?: string;
}) {
  return (
    <section className="ks-closing">
      <span aria-hidden="true" className="ks-closing__wash" />
      <Image
        alt=""
        className="ks-closing__art"
        height={536}
        sizes="(min-width: 48rem) 40vw, 100vw"
        src="/images/closing-cta-room.webp"
        width={1296}
      />
      <div className="ks-closing__body">
        <EditorialHeading size="h3" className="max-w-xl">
          {heading ?? words.heading}
        </EditorialHeading>
        <div className="ks-closing__actions">
          <PrimaryButton asChild arrow>
            <Link href="/umow-wizyte">{words.bookingLabel}</Link>
          </PrimaryButton>
          <ArrowLink href="/kontakt">{words.contactLabel}</ArrowLink>
        </div>
      </div>
    </section>
  );
}
