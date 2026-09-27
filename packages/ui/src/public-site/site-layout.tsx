import type { ReactNode } from "react";
import { JsonLd } from "./json-ld";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SiteIntro } from "./site-intro";
import { logoMarkSrc } from "./site-logo";
import type {
  SiteContact,
  SiteLink,
  SiteNavItem,
  SiteSocial,
} from "./site-types";
import { SkipLink } from "./skip-link";

// Server-safe. The frame of every public page, in landmark order:
//
//   (first-visit intro) → skip link → <header> (banner, with <nav>) → <main id="tresc"> → <footer>
//
// plus the centre as schema.org structured data when the site's origin is
// known. Pages render their sections as children; each page has one <h1>.

export interface SiteLayoutProps {
  navigation: readonly SiteNavItem[];
  cta?: SiteLink;
  contact: SiteContact;
  socials?: readonly SiteSocial[];
  legal?: readonly SiteLink[];
  about?: string;
  currentPath?: string;
  /** Absolute origin, e.g. https://kolorsensu.pl, for structured data. */
  siteUrl?: string;
  year?: number;
  /** The first-visit brand intro (site-intro.tsx). */
  intro?: boolean;
  children: ReactNode;
}

export function SiteLayout({
  navigation,
  cta,
  contact,
  socials = [],
  legal,
  about,
  currentPath,
  siteUrl,
  year,
  intro = true,
  children,
}: SiteLayoutProps) {
  return (
    <div className="bg-bg font-body text-ink flex min-h-screen flex-col">
      {intro ? <SiteIntro /> : null}
      <SkipLink />
      <SiteHeader
        navigation={navigation}
        cta={cta}
        contact={contact}
        currentPath={currentPath}
      />
      <main
        id="tresc"
        tabIndex={-1}
        className="flex-1 overflow-x-clip outline-none"
      >
        {children}
      </main>
      <SiteFooter
        navigation={navigation}
        contact={contact}
        socials={socials}
        legal={legal}
        about={about}
        year={year}
      />
      {siteUrl ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: "Kolor Sensu",
            description: about,
            url: siteUrl,
            logo: new URL(logoMarkSrc, siteUrl).toString(),
            telephone: contact.phone,
            email: contact.email,
            address: {
              "@type": "PostalAddress",
              streetAddress: contact.address.street,
              postalCode: contact.address.postalCode,
              addressLocality: contact.address.city,
              addressCountry: "PL",
            },
            sameAs: socials.map((social) => social.href),
          }}
        />
      ) : null}
    </div>
  );
}
