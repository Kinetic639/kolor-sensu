import type { Meta, StoryObj } from "@storybook/react";
import { AppSidebar, type PortalNavigationSection } from "./portal-layout";
import { SidebarProvider } from "./sidebar";

const sections: PortalNavigationSection[] = [
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

const meta = {
  title: "Portal/AppSidebar",
  component: AppSidebar,
  args: {
    sections,
    currentPath: "/",
  },
  parameters: { canvasPadding: false },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  render: (args) => (
    <SidebarProvider defaultOpen>
      <AppSidebar {...args} />
    </SidebarProvider>
  ),
};

export const CollapsedIconRail: Story = {
  render: (args) => (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar {...args} />
    </SidebarProvider>
  ),
};
