import type { PublicNavigationItem } from "@repo/ui/public-site-shell";

/**
 * The single source of truth for which public routes exist. Extend this
 * only once a route is actually implemented -- never to fill out
 * navigation with pages that don't exist yet.
 */
export const publicNavigation: PublicNavigationItem[] = [
  { label: "Strona główna", href: "/" },
  { label: "Specjaliści", href: "/specjalisci" },
];
