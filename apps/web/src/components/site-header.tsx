"use client";

import { publicNavigation } from "@/lib/public-navigation";
import { PublicSiteHeader } from "@repo/ui/public-site-shell";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <PublicSiteHeader currentPath={pathname} navigation={publicNavigation} />
  );
}
