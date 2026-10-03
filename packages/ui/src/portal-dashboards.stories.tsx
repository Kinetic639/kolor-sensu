import type { Meta, StoryObj } from "@storybook/react";
import {
  AlertCircle,
  Armchair,
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
  SpecialistDashboard,
  type SpecialistDashboardProps,
} from "./portal-dashboards";
import type {
  PortalNavigationItem,
  PortalNavigationSection,
} from "./portal-layout";
import { PortalShell } from "./portal-shell";

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

const specialistDashboardProps: SpecialistDashboardProps = {
  title: "Panel główny",
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

export const SpecialistDesktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <SpecialistDashboardStory />,
};

export const SpecialistMobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => <SpecialistDashboardStory />,
};
