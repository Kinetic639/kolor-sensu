import type { Meta, StoryObj } from "@storybook/react";
import {
  AlertCircle,
  BedDouble,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clock3,
  UserRound,
  Users,
} from "lucide-react";
import {
  AdminDashboard,
  SpecialistDashboard,
  type AdminDashboardProps,
  type SpecialistDashboardProps,
} from "./portal-dashboards";
import type {
  PortalNavigationItem,
  PortalNavigationSection,
} from "./portal-layout";
import { PortalShell } from "./portal-shell";

const adminNavigation: PortalNavigationSection[] = [
  {
    label: "OPERACJE",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" },
      {
        label: "Kalendarz i rezerwacje",
        href: "/kalendarz",
        icon: "calendar",
      },
    ],
  },
  {
    label: "ZESPÓŁ I ZASOBY",
    items: [
      { label: "Specjaliści", href: "/specjalisci", icon: "specialists" },
      { label: "Gabinety", href: "/gabinety", icon: "rooms" },
      { label: "Oferta", href: "/oferta", icon: "services" },
      { label: "Klienci", href: "/klienci", icon: "clients" },
    ],
  },
  {
    label: "STRONA",
    items: [{ label: "CMS", href: "/cms", icon: "cms" }],
  },
  {
    label: "SYSTEM",
    items: [{ label: "Ustawienia", href: "/ustawienia", icon: "settings" }],
  },
];

const specialistNavigation: PortalNavigationSection[] = [
  {
    label: "PRACA",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" },
      { label: "Mój kalendarz", href: "/kalendarz", icon: "calendar" },
      { label: "Dostępność", href: "/dostepnosc", icon: "clock" },
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

const adminMobileNavigation: PortalNavigationItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Kalendarz", href: "/kalendarz", icon: "calendar" },
  { label: "Zespół", href: "/specjalisci", icon: "specialists" },
  { label: "Gabinety", href: "/gabinety", icon: "rooms" },
  { label: "Więcej", href: "/ustawienia", icon: "settings" },
];

const specialistMobileNavigation: PortalNavigationItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Kalendarz", href: "/kalendarz", icon: "calendar" },
  { label: "Dostępność", href: "/dostepnosc", icon: "clock" },
  { label: "Profil", href: "/profil", icon: "specialist" },
  { label: "Więcej", href: "/ustawienia", icon: "settings" },
];

const appointments = [
  {
    id: "visit-1",
    time: "09:00",
    duration: "50 min",
    clientName: "Julia Nowak",
    service: "Psychoterapia indywidualna",
    location: "Gabinet Zielony",
    status: "Potwierdzona",
    statusTone: "success" as const,
  },
  {
    id: "visit-2",
    time: "11:30",
    duration: "50 min",
    clientName: "Tomasz Lewandowski",
    service: "Konsultacja psychologiczna",
    location: "Gabinet Błękitny",
  },
  {
    id: "visit-3",
    time: "15:00",
    duration: "80 min",
    clientName: "Maria i Piotr",
    service: "Terapia par",
    location: "Gabinet Piaskowy",
  },
];

const attention = [
  {
    id: "attention-1",
    title: "3 rezerwacje czekają na potwierdzenie",
    description: "Najstarsza od wczoraj, 18:40",
    icon: CalendarClock,
    tone: "warning" as const,
  },
  {
    id: "attention-2",
    title: "Brak notatki po wizycie",
    description: "Julia Nowak · wczoraj, 17:00",
    icon: AlertCircle,
    tone: "danger" as const,
  },
];

const adminDashboardProps: AdminDashboardProps = {
  title: "Dzień dobry, Michale",
  description: "Oto co dzieje się dziś w Kolorze Sensu.",
  dateLabel: "Poniedziałek, 21 września",
  metrics: [
    {
      id: "today",
      label: "Wizyty dzisiaj",
      value: 8,
      detail: "2 zakończone",
      icon: CalendarCheck,
      tone: "mint",
    },
    {
      id: "pending",
      label: "Oczekujące rezerwacje",
      value: 3,
      detail: "Wymagają decyzji",
      icon: CalendarClock,
      tone: "peach",
    },
    {
      id: "team",
      label: "Specjaliści dziś",
      value: "7 / 9",
      detail: "2 osoby nieobecne",
      icon: Users,
      tone: "lilac",
    },
    {
      id: "rooms",
      label: "Obłożenie gabinetów",
      value: "78%",
      detail: "4 z 5 w użyciu",
      icon: Building2,
      tone: "blue",
    },
  ],
  appointments,
  attention,
  rooms: [
    {
      id: "green",
      title: "Gabinet Zielony",
      description: "4 wizyty",
      value: "09:00–17:30",
      icon: BedDouble,
      tone: "success",
    },
    {
      id: "blue",
      title: "Gabinet Błękitny",
      description: "3 wizyty",
      value: "10:00–18:00",
      icon: BedDouble,
      tone: "info",
    },
    {
      id: "sand",
      title: "Gabinet Piaskowy",
      description: "2 wizyty",
      value: "12:00–19:00",
      icon: BedDouble,
      tone: "warning",
    },
  ],
  team: [
    {
      id: "anna",
      title: "Anna Kowalska",
      description: "Psychoterapeutka",
      value: "4 wizyty",
      icon: UserRound,
      tone: "success",
    },
    {
      id: "marek",
      title: "Marek Wiśniewski",
      description: "Psycholog",
      value: "3 wizyty",
      icon: UserRound,
      tone: "info",
    },
    {
      id: "ewa",
      title: "Ewa Kamińska",
      description: "Psychoterapeutka par",
      value: "2 wizyty",
      icon: UserRound,
      tone: "warning",
    },
  ],
  events: [
    {
      id: "event-1",
      day: "24",
      month: "WRZ",
      title: "Warsztat: Spokojniej w relacjach",
      meta: "18:00 · Sala warsztatowa · 8 zapisów",
    },
    {
      id: "event-2",
      day: "02",
      month: "PAŹ",
      title: "Grupa wsparcia dla rodziców",
      meta: "17:30 · Sala warsztatowa · 5 zapisów",
    },
  ],
};

const specialistDashboardProps: SpecialistDashboardProps = {
  title: "Panel główny",
  description:
    "Dzień dobry, Anno. Sprawdź swój plan i najważniejsze sprawy na dziś.",
  dateLabel: "Poniedziałek, 21 września",
  metrics: [
    {
      id: "today",
      label: "Wizyty dziś",
      value: 4,
      detail: "Pierwsza o 09:00",
      icon: CalendarCheck,
      tone: "mint",
    },
    {
      id: "week",
      label: "Wizyty w tym tygodniu",
      value: 18,
      detail: "+2 względem poprzedniego",
      icon: CalendarDays,
      tone: "blue",
      trend: "+2",
      trendDirection: "up",
    },
    {
      id: "next",
      label: "Najbliższa wizyta",
      value: "09:00",
      detail: "Julia Nowak",
      icon: CalendarClock,
      tone: "lilac",
    },
    {
      id: "free",
      label: "Wolne godziny",
      value: "6 h",
      detail: "W tym tygodniu",
      icon: Clock3,
      tone: "peach",
    },
  ],
  appointments,
  attention: [
    attention[1]!,
    {
      id: "attention-3",
      title: "Zaktualizuj dostępność",
      description: "Brakuje godzin na przyszły tydzień",
      icon: Clock3,
      tone: "warning",
    },
  ],
  availability: [
    {
      id: "monday",
      day: "Pon",
      date: "21.09",
      hours: "09–17",
      available: true,
    },
    {
      id: "tuesday",
      day: "Wt",
      date: "22.09",
      hours: "10–18",
      available: true,
    },
    { id: "wednesday", day: "Śr", date: "23.09", hours: "Brak" },
    {
      id: "thursday",
      day: "Czw",
      date: "24.09",
      hours: "12–19",
      available: true,
    },
    { id: "friday", day: "Pt", date: "25.09", hours: "09–15", available: true },
    { id: "saturday", day: "Sob", date: "26.09", hours: "Brak" },
  ],
  services: [
    {
      id: "individual",
      title: "Psychoterapia indywidualna",
      description: "50 minut",
      value: "220 zł",
      icon: UserRound,
      tone: "success",
    },
    {
      id: "consultation",
      title: "Konsultacja psychologiczna",
      description: "50 minut",
      value: "200 zł",
      icon: BookOpen,
      tone: "info",
    },
    {
      id: "online",
      title: "Psychoterapia online",
      description: "50 minut",
      value: "220 zł",
      icon: CalendarDays,
      tone: "warning",
    },
  ],
  events: [
    {
      id: "supervision",
      day: "23",
      month: "WRZ",
      title: "Superwizja zespołowa",
      meta: "12:00 · Sala warsztatowa",
    },
    {
      id: "workshop",
      day: "24",
      month: "WRZ",
      title: "Warsztat: Spokojniej w relacjach",
      meta: "18:00 · Prowadzenie: Ewa Kamińska",
    },
  ],
};

function AdminDashboardStory() {
  return (
    <PortalShell
      brandSubtitle="Panel administracyjny"
      mobileNavigation={adminMobileNavigation}
      navigation={adminNavigation}
      notificationCount={3}
      user={{ name: "Michał Stępień", role: "Administrator centrum" }}
    >
      <AdminDashboard {...adminDashboardProps} />
    </PortalShell>
  );
}

function SpecialistDashboardStory() {
  return (
    <PortalShell
      brandSubtitle="Panel specjalisty"
      mobileNavigation={specialistMobileNavigation}
      navigation={specialistNavigation}
      notificationCount={2}
      profileHref="/profil"
      user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
    >
      <SpecialistDashboard {...specialistDashboardProps} />
    </PortalShell>
  );
}

const meta = {
  title: "Portal/Dashboard Compositions",
  parameters: {
    canvasPadding: false,
    controls: { disable: true },
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/" },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AdminDesktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <AdminDashboardStory />,
};

export const AdminMobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => <AdminDashboardStory />,
};

export const SpecialistDesktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <SpecialistDashboardStory />,
};

export const SpecialistMobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => <SpecialistDashboardStory />,
};
