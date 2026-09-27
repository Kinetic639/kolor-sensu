import { CookieConsent, SiteLayout } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { Dancing_Script, Figtree, Lora } from "next/font/google";
import {
  siteDescription,
  siteName,
  siteTagline,
  siteUrl,
} from "@/content/site";
import { getSiteFrame } from "@/lib/site-frame";
import "./globals.css";

// Every page is prerendered with its data and refreshed in the background
// at most every 5 minutes; /api/revalidate refreshes a path at once.
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
const dancingScript = Dancing_Script({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dancing-script",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | ${siteTagline}`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName,
    images: [{ url: "/images/gabinet.jpg", alt: "Gabinet Kolor Sensu" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { navigation, cta, contact, socials, legal, about } =
    await getSiteFrame();

  return (
    <html
      lang="pl"
      className={`${lora.variable} ${figtree.variable} ${dancingScript.variable}`}
    >
      <body>
        <SiteLayout
          navigation={navigation}
          cta={cta}
          contact={contact}
          socials={socials}
          legal={legal}
          about={about}
          siteUrl={siteUrl}
          year={new Date().getFullYear()}
        >
          {children}
        </SiteLayout>
        <CookieConsent />
      </body>
    </html>
  );
}
