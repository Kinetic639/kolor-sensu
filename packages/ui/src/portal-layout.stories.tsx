import {
  CalendarDays,
  Clock3,
  Home,
  Settings,
  Tag,
  UserRound,
} from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react";
import { AppHeader } from "./app-header";
import { MetricCard, PageHeader } from "./portal-content";
import {
  AppShell,
  AppSidebar,
  MobileBottomNav,
  type PortalNavigationItem,
  type PortalNavigationSection,
} from "./portal-layout";

const sections: PortalNavigationSection[] = [
  {
    label: "Praca",
    items: [
      { label: "Panel główny", href: "#", icon: Home, active: true },
      { label: "Mój kalendarz", href: "#", icon: CalendarDays },
      { label: "Dostępność", href: "#", icon: Clock3 },
    ],
  },
  {
    label: "Oferta",
    items: [{ label: "Usługi i stawki", href: "#", icon: Tag }],
  },
  {
    label: "Profil",
    items: [{ label: "Mój profil", href: "#", icon: UserRound }],
  },
  {
    label: "Konto",
    items: [{ label: "Ustawienia", href: "#", icon: Settings }],
  },
];

const mobileItems: PortalNavigationItem[] = [
  { label: "Panel", href: "#", icon: Home, active: true },
  { label: "Kalendarz", href: "#", icon: CalendarDays },
  { label: "Dostępność", href: "#", icon: Clock3 },
  { label: "Profil", href: "#", icon: UserRound },
  { label: "Więcej", href: "#", icon: Settings },
];

function PortalShellExample() {
  return (
    <AppShell
      sidebar={<AppSidebar sections={sections} />}
      header={
        <AppHeader
          notificationCount={3}
          user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
        />
      }
      mobileNavigation={<MobileBottomNav items={mobileItems} />}
    >
      <PageHeader
        title="Panel główny"
        description="Wspólna hierarchia portalu bez implementowania konkretnej strony produktu."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="z 4 zaplanowanych"
          icon={CalendarDays}
          label="Wizyty dziś"
          tone="mint"
          trend="+1"
          trendDirection="up"
          value="4"
        />
        <MetricCard
          detail="w tym tygodniu"
          icon={Clock3}
          label="Wolne godziny"
          tone="peach"
          value="8 h"
        />
      </div>
    </AppShell>
  );
}

const meta = {
  title: "Portal/AppShell",
  component: AppShell,
  args: { children: null, header: null, sidebar: null },
  parameters: {
    canvasPadding: false,
    controls: { disable: true },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <PortalShellExample />,
};

export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
  render: () => <PortalShellExample />,
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => <PortalShellExample />,
};
