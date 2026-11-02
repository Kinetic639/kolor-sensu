import Image from "next/image";
import { useId } from "react";
import { PrimaryButton } from "./actions";
import { HanddrawnLink } from "./handdrawn-link";
import { PageLink } from "./page-link";
import { EditorialHeading, SectionEyebrow } from "./typography";

export interface ClosingBannerProps {
  heading: string;
  bookingLabel: string;
  contactLabel: string;
}

/** A painted invitation, with the plant extending above the painted band. */
export function ClosingBanner({
  heading,
  bookingLabel,
  contactLabel,
}: ClosingBannerProps) {
  const headingId = useId();

  return (
    <section className="ks-closing-banner" aria-labelledby={headingId}>
      <div className="ks-closing-banner__paint" aria-hidden="true" />
      <div className="ks-closing-banner__inner max-w-page px-gutter mx-auto">
        <div className="ks-closing-banner__scene" aria-hidden="true">
          <Image
            src="/watercolor/closing-banner-chair.webp"
            alt=""
            width={1448}
            height={1086}
            sizes="(min-width: 1122px) 460px, (min-width: 1024px) 41vw, (min-width: 640px) 340px, 85vw"
            className="ks-closing-banner__chair"
          />
        </div>
        <div className="ks-closing-banner__copy">
          <SectionEyebrow className="ks-closing-banner__eyebrow text-[#a65055]">
            Pierwszy krok
          </SectionEyebrow>
          <EditorialHeading
            id={headingId}
            size="h3"
            className="text-[clamp(1.8rem,1.4rem+1vw,2.5rem)] leading-[1.2] font-semibold"
          >
            {heading}
          </EditorialHeading>
          <p className="ks-closing-banner__description">
            Jesteśmy tutaj, aby Ci towarzyszyć.
          </p>
        </div>
        <div className="ks-closing-banner__actions">
          <PrimaryButton asChild arrow className="ks-closing-banner__booking">
            <PageLink href="/umow-wizyte">{bookingLabel}</PageLink>
          </PrimaryButton>
          <HanddrawnLink href="/kontakt">{contactLabel}</HanddrawnLink>
        </div>
      </div>
    </section>
  );
}
