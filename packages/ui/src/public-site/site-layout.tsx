import type { ReactNode } from "react";
import { AnnouncementBar, type SiteAnnouncement } from "./announcement-bar";
import { CursorRing } from "./cursor-ring";
import { JsonLd } from "./json-ld";
import { SiteFooter } from "./site-footer";
import type { CrisisLine } from "./crisis-strip";
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
//   (first-visit intro) → skip link → (the announcement) → <header> (banner, with <nav>) → <main id="tresc"> → <footer>
//
// plus the centre as schema.org structured data when the site's origin is
// known. Pages render their sections as children; each page has one <h1>.
// The mouse's companion ring (CursorRing) follows on every page.

export interface SiteLayoutProps {
  navigation: readonly SiteNavItem[];
  cta?: SiteLink;
  contact?: SiteContact;
  socials?: readonly SiteSocial[];
  legal?: readonly SiteLink[];
  about?: string;
  currentPath?: string;
  /** Absolute origin, e.g. https://kolorsensu.pl, for structured data. */
  siteUrl?: string;
  year?: number;
  /** The first-visit brand intro (site-intro.tsx). */
  intro?: boolean;
  /** The centre's announcement for today: a bar above the header. */
  announcement?: SiteAnnouncement | null;
  /** The company in one line, in the footer (Ustawienia → Centrum). */
  company?: string | null;
  /** The newsletter's sign-up form, in the footer (when it is on). */
  newsletter?: ReactNode;
  crisisLines?: readonly CrisisLine[];
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
  announcement = null,
  company = null,
  newsletter = null,
  crisisLines,
  children,
}: SiteLayoutProps) {
  return (
    <div className="bg-bg font-body text-ink flex min-h-screen flex-col">
      {intro ? <SiteIntro /> : null}
      <SkipLink />
      {announcement ? <AnnouncementBar announcement={announcement} /> : null}
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
        company={company}
        newsletter={newsletter}
        crisisLines={crisisLines}
      />
      <CursorRing />
      {siteUrl ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: "Kolor Sensu",
            description: about,
            url: siteUrl,
            logo: new URL(logoMarkSrc, siteUrl).toString(),
            ...(contact && {
              telephone: contact.phone,
              email: contact.email,
              address: {
                "@type": "PostalAddress",
                streetAddress: contact.address.street,
                postalCode: contact.address.postalCode,
                addressLocality: contact.address.city,
                addressCountry: "PL",
              },
            }),
            sameAs: socials.map((social) => social.href),
          }}
        />
      ) : null}
    </div>
  );
}
