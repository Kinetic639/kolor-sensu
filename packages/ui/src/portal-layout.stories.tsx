import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor } from "storybook/test";
import { CalendarDays, Clock3 } from "lucide-react";
import { MetricCard, PageHeader } from "./portal-content";
import type {
  PortalNavigationItem,
  PortalNavigationSection,
} from "./portal-layout";
import { PortalShell } from "./portal-shell";

const navigation: PortalNavigationSection[] = [
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
    label: "KONTO",
    items: [{ label: "Ustawienia", href: "/ustawienia", icon: "settings" }],
  },
];

const mobileNavigation: PortalNavigationItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Kalendarz", href: "/kalendarz", icon: "calendar" },
  { label: "Dostępność", href: "/dostepnosc", icon: "clock" },
  { label: "Profil", href: "/profil", icon: "specialist" },
  { label: "Więcej", href: "/ustawienia", icon: "settings" },
];

function PortalShellExample({
  defaultSidebarOpen = true,
}: {
  defaultSidebarOpen?: boolean;
}) {
  return (
    <PortalShell
      brandSubtitle="Panel specjalisty"
      defaultSidebarOpen={defaultSidebarOpen}
      mobileNavigation={mobileNavigation}
      navigation={navigation}
      notificationCount={3}
      profileHref="/profil"
      user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
    >
      <PageHeader
        title="Panel główny"
        description="Wspólny produkcyjny shell portalu bez logiki konkretnej funkcji."
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
    </PortalShell>
  );
}

// The sidebar header is exactly as tall as the main header, so their bottom
// borders form one line.
async function expectHeadersAligned({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) {
  const heights = () => {
    const header = canvasElement.querySelector<HTMLElement>("header");
    const sidebarHeader = canvasElement.querySelector<HTMLElement>(
      "[data-portal-sidebar-header]",
    );
    return [header, sidebarHeader].map((element) =>
      element ? Math.round(element.getBoundingClientRect().height) : null,
    );
  };
  await waitFor(() => {
    const [header, sidebarHeader] = heights();
    expect(sidebarHeader).toBe(header);
  });
}

const meta = {
  title: "Portal/AppShell",
  component: PortalShell,
  parameters: {
    canvasPadding: false,
    controls: { disable: true },
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/" },
    },
  },
} satisfies Meta<typeof PortalShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopExpanded: Story = {
  args: {
    brandSubtitle: "Panel specjalisty",
    children: null,
    mobileNavigation,
    navigation,
    user: { name: "Anna Kowalska", role: "Psychoterapeutka" },
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <PortalShellExample />,
  play: expectHeadersAligned,
};

export const DesktopCollapsed: Story = {
  ...DesktopExpanded,
  render: () => <PortalShellExample defaultSidebarOpen={false} />,
  play: expectHeadersAligned,
};

export const Tablet: Story = {
  ...DesktopExpanded,
  play: undefined,
  globals: { viewport: { value: "tablet", isRotated: false } },
};

export const Mobile: Story = {
  ...DesktopExpanded,
  play: undefined,
  globals: { viewport: { value: "mobile", isRotated: false } },
};
