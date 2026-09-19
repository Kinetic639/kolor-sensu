import { QueryProvider } from "@repo/app-runtime/query-provider";
import { AppToaster } from "@repo/ui/toaster";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Specialist Portal | Kolor Sensu",
  description: "Specialist portal for Kolor Sensu.",
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
