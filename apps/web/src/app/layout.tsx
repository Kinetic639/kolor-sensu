import { CookieConsent, SiteLayout } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { Dancing_Script, Figtree, Lora } from "next/font/google";
import {
  siteDescription,
  siteName,
  siteTagline,
  siteUrl,
} from "@/content/site";
import { PageTransition } from "@/components/page-transition";
import { PreviewBar } from "@/components/preview-bar";
import { NewsletterSignup } from "@/features/newsletter/newsletter-signup";
import { newsletterSiteKey } from "@/features/newsletter/site-key";
import { baseOpenGraph } from "@/lib/page-metadata";
import { getCompany, getNewsletterBand } from "@/lib/public-data";
import { getSiteFrame } from "@/lib/site-frame";
import "./globals.css";

// Every page is prerendered with its data and refreshed in the background
// at most every 5 minutes; /api/revalidate refreshes a path at once. The
// CMS preview (Draft Mode) renders each request afresh, with the drafts.
export const revalidate = 300;

// The public theme reads these variables (public-theme.css: display serif,
// body sans, handwritten captions). latin-ext for Polish letters.
const lora = Lora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-lora",
  display: "swap",
});
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree",
  display: "swap",
});
// Only short captions use it: not preloaded, so it does not hold back the
// stylesheet and the hero picture on a slow phone.
const dancingScript = Dancing_Script({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dancing-script",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | ${siteTagline}`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  // A page's own title, description and picture: lib/page-metadata.ts;
  // the picture otherwise each page's opengraph-image.tsx (lib/og-image.tsx).
  openGraph: baseOpenGraph,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [
    { navigation, cta, contact, socials, legal, about, announcement, company },
    newsletterBand,
    companyDetails,
  ] = await Promise.all([getSiteFrame(), getNewsletterBand(), getCompany()]);
  // The newsletter's form in the footer, once the CMS shows the newsletter
  // (and the site can check for bots).
  const turnstileSiteKey = newsletterBand.visible ? newsletterSiteKey() : null;

  return (
    <html
      // Smooth within a page (anchors), not when Next scrolls a new page
      // to its top: that jump stays under the page's transition.
      data-scroll-behavior="smooth"
      lang="pl"
      className={`${lora.variable} ${figtree.variable} ${dancingScript.variable}`}
    >
      <body>
        <SiteLayout
          announcement={announcement}
          navigation={navigation}
          cta={cta}
          contact={contact}
          socials={socials}
          legal={legal}
          about={about}
          company={company}
          newsletter={
            turnstileSiteKey ? (
              <NewsletterSignup
                compact
                controller={companyDetails?.legalName ?? "Kolor Sensu"}
                source="footer"
                turnstileSiteKey={turnstileSiteKey}
              />
            ) : null
          }
          siteUrl={siteUrl}
          year={new Date().getFullYear()}
          // The first-visit intro is off for now: it covers the page for
          // about 4.4 s, which made it the page's largest paint (mobile
          // Lighthouse 54). It stays in @repo/ui (site-intro.tsx, Storybook)
          // to come back shorter; set this to true to show it again.
          intro={false}
        >
          <PageTransition>{children}</PageTransition>
        </SiteLayout>
        <CookieConsent />
        {/* The CMS preview's bar (Draft Mode only; nothing for visitors). */}
        <PreviewBar />
      </body>
    </html>
  );
}
