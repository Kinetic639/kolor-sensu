import { QueryProvider } from "@repo/app-runtime/query-provider";
import { parseTheme, THEME_COOKIE } from "@repo/ui/theme";
import { AppToaster } from "@repo/ui/toaster";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Portal | Kolor Sensu",
  description: "Administration portal for Kolor Sensu.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The person's colour theme, on the page from the first paint.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html data-theme={theme} lang="pl">
      <body>
        <NuqsAdapter>
          <QueryProvider>{children}</QueryProvider>
        </NuqsAdapter>
        <AppToaster />
      </body>
    </html>
  );
}
