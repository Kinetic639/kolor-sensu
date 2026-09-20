import { SiteHeader } from "@/components/site-header";
import { publicNavigation } from "@/lib/public-navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { QueryProvider } from "@repo/app-runtime/query-provider";
import { getPublicCenterProfile } from "@repo/supabase";
import { PublicSiteFooter } from "@repo/ui/public-site-shell";
import { AppToaster } from "@repo/ui/toaster";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kolor Sensu | Centrum Psychoterapii",
  description: "Public website and appointment booking for Kolor Sensu.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reads only the published, safe-column projection -- RLS returns null
  // until the center profile is actually published, so the footer stays
  // minimal by default rather than inventing contact details.
  const centerProfile = await getPublicCenterProfile(createPublicClient());

  return (
    <html lang="pl">
      <body className="flex min-h-screen flex-col">
        <QueryProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <PublicSiteFooter
            centerProfile={centerProfile}
            navigation={publicNavigation}
          />
        </QueryProvider>
        <AppToaster />
      </body>
    </html>
  );
}
