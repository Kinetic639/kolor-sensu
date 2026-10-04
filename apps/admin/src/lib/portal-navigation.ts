import type {
  PortalNavigationItem,
  PortalNavigationSection,
} from "@repo/ui/portal-layout";

export const adminNavigation: PortalNavigationSection[] = [
  {
    label: "PRACA / OPERACJE",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" },
      { label: "Rezerwacje", href: "/rezerwacje", icon: "bookings" },
      { label: "Klienci", href: "/klienci", icon: "clients" },
    ],
  },
  {
    label: "ZESPÓŁ I ZASOBY",
    items: [
      { label: "Kalendarz", href: "/kalendarz", icon: "calendar" },
      { label: "Specjaliści", href: "/specjalisci", icon: "specialists" },
      { label: "Gabinety", href: "/gabinety", icon: "rooms" },
      { label: "Oferta", href: "/oferta", icon: "services" },
    ],
  },
  {
    label: "STRONA",
    items: [
      { label: "CMS", href: "/cms", icon: "cms" },
      { label: "Ogłoszenia", href: "/ogloszenia", icon: "announcements" },
    ],
  },
  {
    label: "SYSTEM",
    items: [{ label: "Ustawienia", href: "/ustawienia", icon: "settings" }],
  },
];

export const adminMobileNavigation: PortalNavigationItem[] = [
  { label: "Start", href: "/", icon: "dashboard" },
  { label: "Kalendarz", href: "/kalendarz", icon: "calendar" },
  { label: "Rezerwacje", href: "/rezerwacje", icon: "bookings" },
  { label: "Zespół", href: "/specjalisci", icon: "specialists" },
  { label: "Więcej", href: "/ustawienia", icon: "settings" },
];
