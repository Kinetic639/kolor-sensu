import type {
  PortalNavigationItem,
  PortalNavigationSection,
} from "@repo/ui/portal-layout";

export const specialistNavigation: PortalNavigationSection[] = [
  {
    label: "PRACA",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" },
      { label: "Mój kalendarz", href: "/kalendarz", icon: "calendar" },
      {
        label: "Dostępność",
        href: "/dostepnosc",
        icon: "clock",
        badge: "Dyżury",
      },
    ],
  },
  {
    label: "REZERWACJE",
    items: [
      { label: "Moje rezerwacje", href: "/rezerwacje", icon: "bookings" },
    ],
  },
  {
    label: "OFERTA",
    items: [
      { label: "Moje usługi i stawki", href: "/uslugi", icon: "services" },
    ],
  },
  {
    label: "PROFIL",
    items: [{ label: "Mój profil", href: "/profil", icon: "specialist" }],
  },
  {
    label: "KONTO",
    items: [{ label: "Ustawienia", href: "/ustawienia", icon: "settings" }],
  },
];

export const specialistMobileNavigation: PortalNavigationItem[] = [
  { label: "Start", href: "/", icon: "dashboard" },
  { label: "Kalendarz", href: "/kalendarz", icon: "calendar" },
  { label: "Rezerwacje", href: "/rezerwacje", icon: "bookings" },
  { label: "Dostępność", href: "/dostepnosc", icon: "clock" },
  { label: "Profil", href: "/profil", icon: "specialist" },
];
