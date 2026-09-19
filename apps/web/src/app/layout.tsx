import { QueryProvider } from "@repo/app-runtime/query-provider";
import { AppToaster } from "@repo/ui/toaster";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kolor Sensu | Centrum Psychoterapii",
  description: "Public website and appointment booking for Kolor Sensu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>
        <QueryProvider>{children}</QueryProvider>
        <AppToaster />
      </body>
    </html>
  );
}
