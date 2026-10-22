import type { DetailTab } from "@repo/ui/detail-page";

// Newsletter's two tabs: the issues written here, and the addresses.

export function newsletterTabs(counts: {
  issues: number;
  active: number;
}): DetailTab[] {
  return [
    {
      key: "wydania",
      label: "Wydania",
      href: "/newsletter",
      count: counts.issues,
    },
    {
      key: "adresy",
      label: "Adresy",
      href: "/newsletter/adresy",
      count: counts.active,
    },
  ];
}
