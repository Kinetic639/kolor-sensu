import { QueryProvider } from "@repo/app-runtime/query-provider";
import { AppToaster } from "@repo/ui/toaster";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Portal | Kolor Sensu",
  description: "Administration portal for Kolor Sensu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>
        <NuqsAdapter>
          <QueryProvider>{children}</QueryProvider>
        </NuqsAdapter>
        <AppToaster />
      </body>
    </html>
  );
}
